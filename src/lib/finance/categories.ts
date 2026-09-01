import { prisma } from "@/lib/prisma";
import type { FinanceCategoryKind, FinanceFlow, FinanceOwner } from "@prisma/client";

export type DefaultCategory = {
  name: string;
  flow: FinanceFlow;
  owner: FinanceOwner | null;
  kind: FinanceCategoryKind;
  keywords: string;
};

// Categorias padrão de um salão novo, no espírito do método "separar CPF e
// CNPJ" + "classifique em: Empresa | Pessoal | Investimento | Imposto | Dívida".
// "keywords" alimenta a sugestão automática ao importar um extrato — são termos
// (sem acento, minúsculos) comparados contra a descrição de cada lançamento.
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // PJ — entradas
  { name: "Vendas e Serviços", flow: "ENTRADA", owner: "PJ", kind: "RECEITA", keywords: "venda,recebimento,maquininha,stone,cielo,getnet,pagseguro,mercado pago,rede,pix recebido" },
  { name: "Outras Receitas PJ", flow: "ENTRADA", owner: "PJ", kind: "RECEITA", keywords: "" },

  // PJ — saídas
  { name: "Fornecedores e Produtos", flow: "SAIDA", owner: "PJ", kind: "VARIAVEL", keywords: "fornecedor,distribuidora,atacad,cosmetic,insumo" },
  { name: "Aluguel e Contas Fixas", flow: "SAIDA", owner: "PJ", kind: "FIXA", keywords: "aluguel,condominio,imobiliaria,energia,luz,agua,internet,telefone" },
  { name: "Funcionários e Comissões", flow: "SAIDA", owner: "PJ", kind: "FIXA", keywords: "salario,folha,comissao,vale transporte,vale-transporte,decimo terceiro" },
  { name: "Impostos e Taxas", flow: "SAIDA", owner: "PJ", kind: "IMPOSTO", keywords: "das,simples nacional,darf,inss,fgts,issqn,imposto,tributo" },
  { name: "Marketing e Divulgação", flow: "SAIDA", owner: "PJ", kind: "VARIAVEL", keywords: "facebook,instagram,meta ads,google ads,impulsion,divulgacao,marketing" },
  { name: "Manutenção e Equipamentos", flow: "SAIDA", owner: "PJ", kind: "VARIAVEL", keywords: "manutencao,reparo,equipamento,conserto" },
  { name: "Taxas Bancárias e Maquininha", flow: "SAIDA", owner: "PJ", kind: "VARIAVEL", keywords: "tarifa,anuidade,taxa maquininha,juros,iof" },
  { name: "Pró-labore / Retirada dos Sócios", flow: "SAIDA", owner: "PJ", kind: "RETIRADA", keywords: "pro-labore,pro labore,retirada socio,retirada do socio,distribuicao lucro" },
  { name: "Outras Despesas PJ", flow: "SAIDA", owner: "PJ", kind: "VARIAVEL", keywords: "" },

  // PF — entradas
  { name: "Pró-labore Recebido", flow: "ENTRADA", owner: "PF", kind: "RECEITA", keywords: "pro-labore,pro labore" },
  { name: "Outras Receitas PF", flow: "ENTRADA", owner: "PF", kind: "RECEITA", keywords: "" },

  // PF — saídas
  { name: "Casa e Moradia", flow: "SAIDA", owner: "PF", kind: "FIXA", keywords: "aluguel,condominio,energia,luz,agua,gas,internet residencial" },
  { name: "Alimentação", flow: "SAIDA", owner: "PF", kind: "VARIAVEL", keywords: "supermercado,mercado,ifood,restaurante,padaria,delivery" },
  { name: "Saúde", flow: "SAIDA", owner: "PF", kind: "VARIAVEL", keywords: "farmacia,plano de saude,consulta,exame,drogaria" },
  { name: "Educação", flow: "SAIDA", owner: "PF", kind: "FIXA", keywords: "escola,faculdade,curso,mensalidade" },
  { name: "Lazer", flow: "SAIDA", owner: "PF", kind: "VARIAVEL", keywords: "viagem,cinema,streaming,netflix,spotify" },
  { name: "Dívidas e Cartão", flow: "SAIDA", owner: "PF", kind: "DIVIDA", keywords: "fatura cartao,fatura do cartao,emprestimo,financiamento,parcela" },
  { name: "Outras Despesas PF", flow: "SAIDA", owner: "PF", kind: "VARIAVEL", keywords: "" },
];

export const KIND_LABELS: Record<FinanceCategoryKind, string> = {
  RECEITA: "Receita",
  FIXA: "Despesa fixa",
  VARIAVEL: "Despesa variável",
  IMPOSTO: "Imposto",
  DIVIDA: "Dívida",
  RETIRADA: "Retirada do dono",
};

// Idempotente: cria as categorias que ainda não existem pro salão. Chamada
// tanto no cadastro de um salão novo quanto de forma preguiçosa nas telas de
// financeiro, pra cobrir salões que já existiam antes dessa funcionalidade.
export async function ensureDefaultCategories(salonId: string) {
  const existing = await prisma.financeCategory.findMany({
    where: { salonId },
    select: { name: true, flow: true },
  });
  const existingKeys = new Set(existing.map((c) => `${c.name}::${c.flow}`));

  const missing = DEFAULT_CATEGORIES.filter((c) => !existingKeys.has(`${c.name}::${c.flow}`));
  if (missing.length === 0) return;

  await prisma.financeCategory.createMany({
    data: missing.map((c) => ({
      salonId,
      name: c.name,
      flow: c.flow,
      owner: c.owner,
      kind: c.kind,
      keywords: c.keywords,
      isSystem: true,
    })),
    skipDuplicates: true,
  });
}
