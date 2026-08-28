import { prisma } from "@/lib/prisma";
import type { FinanceFlow, FinanceOwner } from "@prisma/client";

export type DefaultCategory = {
  name: string;
  flow: FinanceFlow;
  owner: FinanceOwner | null;
  keywords: string;
};

// Categorias padrão de um salão novo, no espírito do método "separar CPF e
// CNPJ" + "classifique em: Empresa | Pessoal | Investimento | Imposto | Dívida".
// "keywords" alimenta a sugestão automática ao importar um extrato — são termos
// (sem acento, minúsculos) comparados contra a descrição de cada lançamento.
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // PJ — entradas
  { name: "Vendas e Serviços", flow: "ENTRADA", owner: "PJ", keywords: "venda,recebimento,maquininha,stone,cielo,getnet,pagseguro,mercado pago,rede,pix recebido" },
  { name: "Outras Receitas PJ", flow: "ENTRADA", owner: "PJ", keywords: "" },

  // PJ — saídas
  { name: "Fornecedores e Produtos", flow: "SAIDA", owner: "PJ", keywords: "fornecedor,distribuidora,atacad,cosmetic,insumo" },
  { name: "Aluguel e Contas Fixas", flow: "SAIDA", owner: "PJ", keywords: "aluguel,condominio,imobiliaria,energia,luz,agua,internet,telefone" },
  { name: "Funcionários e Comissões", flow: "SAIDA", owner: "PJ", keywords: "salario,folha,comissao,vale transporte,vale-transporte,decimo terceiro" },
  { name: "Impostos e Taxas", flow: "SAIDA", owner: "PJ", keywords: "das,simples nacional,darf,inss,fgts,issqn,imposto,tributo" },
  { name: "Marketing e Divulgação", flow: "SAIDA", owner: "PJ", keywords: "facebook,instagram,meta ads,google ads,impulsion,divulgacao,marketing" },
  { name: "Manutenção e Equipamentos", flow: "SAIDA", owner: "PJ", keywords: "manutencao,reparo,equipamento,conserto" },
  { name: "Taxas Bancárias e Maquininha", flow: "SAIDA", owner: "PJ", keywords: "tarifa,anuidade,taxa maquininha,juros,iof" },
  { name: "Pró-labore / Retirada dos Sócios", flow: "SAIDA", owner: "PJ", keywords: "pro-labore,pro labore,retirada socio,retirada do socio,distribuicao lucro" },
  { name: "Outras Despesas PJ", flow: "SAIDA", owner: "PJ", keywords: "" },

  // PF — entradas
  { name: "Pró-labore Recebido", flow: "ENTRADA", owner: "PF", keywords: "pro-labore,pro labore" },
  { name: "Outras Receitas PF", flow: "ENTRADA", owner: "PF", keywords: "" },

  // PF — saídas
  { name: "Casa e Moradia", flow: "SAIDA", owner: "PF", keywords: "aluguel,condominio,energia,luz,agua,gas,internet residencial" },
  { name: "Alimentação", flow: "SAIDA", owner: "PF", keywords: "supermercado,mercado,ifood,restaurante,padaria,delivery" },
  { name: "Saúde", flow: "SAIDA", owner: "PF", keywords: "farmacia,plano de saude,consulta,exame,drogaria" },
  { name: "Educação", flow: "SAIDA", owner: "PF", keywords: "escola,faculdade,curso,mensalidade" },
  { name: "Lazer", flow: "SAIDA", owner: "PF", keywords: "viagem,cinema,streaming,netflix,spotify" },
  { name: "Dívidas e Cartão", flow: "SAIDA", owner: "PF", keywords: "fatura cartao,fatura do cartao,emprestimo,financiamento,parcela" },
  { name: "Outras Despesas PF", flow: "SAIDA", owner: "PF", keywords: "" },
];

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
      keywords: c.keywords,
      isSystem: true,
    })),
    skipDuplicates: true,
  });
}
