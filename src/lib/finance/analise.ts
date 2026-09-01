import type { FinanceCategoryKind, FinanceFlow, FinanceOwner, FinanceStatus } from "@prisma/client";

// Funções puras de cálculo, separadas da página de propósito: são as contas em
// que o dono vai confiar pra tomar decisão, então precisam poder ser lidas (e
// testadas) sem passar por React, Prisma ou HTTP.

export type TransacaoAnalise = {
  amount: number;
  flow: FinanceFlow;
  owner: FinanceOwner;
  status: FinanceStatus;
  dueDate: Date | null;
  categoryKind: FinanceCategoryKind | null;
};

export type Dre = {
  faturamento: number;
  variavel: number;
  fixa: number;
  imposto: number;
  divida: number;
  semClassificacao: number;
  custoTotal: number;
  lucro: number;
  margem: number | null; // null quando não houve faturamento — dividir por zero não é "0%"
  retiradas: number;
  sobra: number;
};

/**
 * Lucro real do negócio (só PJ) na competência.
 *
 * Duas decisões que mudam o número e valem explicação:
 *
 * 1. Só entra o que está PAGO. Compromisso que ainda não venceu não virou
 *    custo nem receita — ele aparece na disponibilidade, não aqui.
 * 2. Retirada do dono (pró-labore) NÃO é custo. Ela sai depois do lucro,
 *    porque é distribuição do resultado. Contar como despesa faria um negócio
 *    lucrativo parecer empatado só porque o dono se pagou.
 */
export function calcularDre(transacoes: TransacaoAnalise[]): Dre {
  const pj = transacoes.filter((t) => t.owner === "PJ" && t.status === "PAGO");

  const faturamento = pj
    .filter((t) => t.flow === "ENTRADA")
    .reduce((s, t) => s + t.amount, 0);

  const saidas = pj.filter((t) => t.flow === "SAIDA");
  const somaPorKind = (kind: FinanceCategoryKind) =>
    saidas.filter((t) => t.categoryKind === kind).reduce((s, t) => s + t.amount, 0);

  const variavel = somaPorKind("VARIAVEL");
  const fixa = somaPorKind("FIXA");
  const imposto = somaPorKind("IMPOSTO");
  const divida = somaPorKind("DIVIDA");
  const retiradas = somaPorKind("RETIRADA");
  // Sem categoria entra no custo mesmo assim: ignorar infla o lucro e engana.
  const semClassificacao = saidas
    .filter((t) => t.categoryKind === null)
    .reduce((s, t) => s + t.amount, 0);

  const custoTotal = variavel + fixa + imposto + divida + semClassificacao;
  const lucro = faturamento - custoTotal;

  return {
    faturamento,
    variavel,
    fixa,
    imposto,
    divida,
    semClassificacao,
    custoTotal,
    lucro,
    margem: faturamento > 0 ? (lucro / faturamento) * 100 : null,
    retiradas,
    sobra: lucro - retiradas,
  };
}

export type Disponibilidade = {
  saldo: number; // tudo que já passou pelo banco (PJ), do começo até agora
  aPagar: number;
  aReceber: number;
  disponivel: number;
};

/**
 * "Saldo não é dinheiro livre": do saldo acumulado descontamos o que já está
 * comprometido. O saldo vem de TODO o histórico (não da competência), porque
 * dinheiro em caixa não zera na virada do mês.
 */
export function calcularDisponibilidade(
  historicoPago: { amount: number; flow: FinanceFlow }[],
  pendentes: { amount: number; flow: FinanceFlow }[]
): Disponibilidade {
  const saldo = historicoPago.reduce(
    (s, t) => s + (t.flow === "ENTRADA" ? t.amount : -t.amount),
    0
  );
  const aPagar = pendentes.filter((t) => t.flow === "SAIDA").reduce((s, t) => s + t.amount, 0);
  const aReceber = pendentes.filter((t) => t.flow === "ENTRADA").reduce((s, t) => s + t.amount, 0);

  return { saldo, aPagar, aReceber, disponivel: saldo - aPagar };
}

export type PassoSemanal = {
  numero: number;
  titulo: string;
  detalhe: string;
  feito: boolean;
};

/**
 * Método dos 30 minutos da apostila, com o estado de cada passo deduzido dos
 * dados — não há checkbox pra marcar. Marcar à mão viraria teatro: o dono
 * marcaria "classifiquei" sem ter classificado. Assim o passo só fica verde
 * quando o dado prova que ele foi feito.
 */
export function montarPassosSemanais(input: {
  lancamentosNaCompetencia: number;
  importouRecentemente: boolean;
  semCategoria: number;
  temVazamento: boolean;
  nomeVazamento: string | null;
  compromissos30Dias: number;
  metaCaixa: number | null;
  disponivel: number;
}): PassoSemanal[] {
  const {
    lancamentosNaCompetencia,
    importouRecentemente,
    semCategoria,
    temVazamento,
    nomeVazamento,
    compromissos30Dias,
    metaCaixa,
    disponivel,
  } = input;

  return [
    {
      numero: 1,
      titulo: "Olhe o extrato",
      detalhe: importouRecentemente
        ? "Extrato importado nos últimos 7 dias."
        : "Importe o extrato do banco pra não depender da memória.",
      feito: importouRecentemente,
    },
    {
      numero: 2,
      titulo: "Classifique",
      detalhe:
        semCategoria === 0
          ? "Tudo classificado nesse mês."
          : `${semCategoria} lançamento${semCategoria > 1 ? "s" : ""} sem categoria.`,
      feito: lancamentosNaCompetencia > 0 && semCategoria === 0,
    },
    {
      numero: 3,
      titulo: "Some",
      detalhe:
        lancamentosNaCompetencia > 0
          ? "Entradas, saídas e resultado estão no topo da tela."
          : "Sem lançamentos nesse mês ainda.",
      feito: lancamentosNaCompetencia > 0,
    },
    {
      numero: 4,
      titulo: "Encontre um vazamento",
      detalhe: temVazamento
        ? `"${nomeVazamento}" cresceu forte em relação ao mês passado.`
        : "Nenhuma categoria disparou em relação ao mês passado.",
      // Achar vazamento é diagnóstico, não tarefa: sem base de comparação o
      // passo fica pendente em vez de fingir que está resolvido.
      feito: lancamentosNaCompetencia > 0,
    },
    {
      numero: 5,
      titulo: "Olhe os próximos 30 dias",
      detalhe:
        compromissos30Dias > 0
          ? `${compromissos30Dias} conta${compromissos30Dias > 1 ? "s" : ""} a vencer.`
          : "Nenhuma conta cadastrada a vencer. Lance o que já está comprometido.",
      feito: compromissos30Dias > 0,
    },
    {
      numero: 6,
      titulo: "Defina uma meta",
      detalhe:
        metaCaixa && metaCaixa > 0
          ? `Meta de ${metaCaixa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} — hoje você tem ${disponivel.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} livres.`
          : "Defina quanto quer ter de reserva de caixa.",
      feito: !!metaCaixa && metaCaixa > 0,
    },
  ];
}
