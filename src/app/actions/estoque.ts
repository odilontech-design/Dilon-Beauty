"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { todayDateStrInSalonTZ } from "@/lib/date";
import { competenciaFromDate } from "@/lib/finance/competencia";
import type { StockMovementType } from "@prisma/client";

function parseNumero(valor: FormDataEntryValue | null): number {
  return Number(String(valor ?? "0").replace(/\./g, "").replace(",", "."));
}

export async function createProduct(formData: FormData) {
  const tenant = await requireTenant();

  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "un").trim() || "un";
  const quantity = parseNumero(formData.get("quantity"));
  const minQuantity = parseNumero(formData.get("minQuantity"));
  const costPrice = parseNumero(formData.get("costPrice"));

  if (!name) throw new Error("Nome do produto é obrigatório.");
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error("Quantidade inicial inválida.");

  const product = await prisma.product.create({
    data: {
      salonId: tenant.salonId,
      name,
      unit,
      quantity,
      minQuantity: Number.isFinite(minQuantity) ? minQuantity : 0,
      costPrice: Number.isFinite(costPrice) ? costPrice : 0,
    },
  });

  // O saldo inicial também vira movimento, senão o histórico começaria com um
  // número que ninguém sabe de onde veio.
  if (quantity > 0) {
    await prisma.stockMovement.create({
      data: {
        salonId: tenant.salonId,
        productId: product.id,
        type: "ENTRADA",
        quantity,
        unitCost: costPrice || null,
        notes: "Saldo inicial",
      },
    });
  }

  revalidatePath("/estoque");
}

export async function setProductActive(id: string, active: boolean) {
  const tenant = await requireTenant();
  await prisma.product.updateMany({ where: { id, salonId: tenant.salonId }, data: { active } });
  revalidatePath("/estoque");
}

export type MovimentoState = { ok: boolean; error?: string };

/**
 * Registra entrada, saída ou ajuste e recalcula o saldo do produto.
 *
 * O saldo e o movimento são gravados na mesma transação: se um falhasse sem o
 * outro, o estoque passaria a mentir — e estoque que mente é pior que estoque
 * nenhum, porque o dono confia nele pra comprar.
 */
export async function registrarMovimento(
  productId: string,
  _prev: MovimentoState,
  formData: FormData
): Promise<MovimentoState> {
  const tenant = await requireTenant();

  const type = String(formData.get("type") ?? "") as StockMovementType;
  const quantidade = parseNumero(formData.get("quantity"));
  const unitCost = parseNumero(formData.get("unitCost"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const lancarNoFinanceiro = formData.get("lancarNoFinanceiro") === "on";

  if (!["ENTRADA", "SAIDA", "AJUSTE"].includes(type)) return { ok: false, error: "Tipo inválido." };
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return { ok: false, error: "Informe uma quantidade maior que zero." };
  }

  const product = await prisma.product.findFirst({ where: { id: productId, salonId: tenant.salonId } });
  if (!product) return { ok: false, error: "Produto não encontrado." };

  // No ajuste a quantidade digitada é o novo saldo contado na prateleira, não
  // uma variação — é assim que o dono pensa quando faz contagem física.
  const novoSaldo =
    type === "ENTRADA"
      ? product.quantity + quantidade
      : type === "SAIDA"
        ? product.quantity - quantidade
        : quantidade;

  if (novoSaldo < 0) {
    return { ok: false, error: `Saldo ficaria negativo (${novoSaldo}). Confira a quantidade.` };
  }

  const custo = Number.isFinite(unitCost) && unitCost > 0 ? unitCost : null;

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: { salonId: tenant.salonId, productId, type, quantity: quantidade, unitCost: custo, notes },
    }),
    prisma.product.update({
      where: { id: productId },
      // Entrada com custo novo atualiza o custo de referência do produto.
      data: { quantity: novoSaldo, ...(type === "ENTRADA" && custo ? { costPrice: custo } : {}) },
    }),
  ]);

  if (type === "ENTRADA" && lancarNoFinanceiro) {
    const total = quantidade * (custo ?? product.costPrice);
    if (total > 0) {
      const categoria = await prisma.financeCategory.findFirst({
        where: { salonId: tenant.salonId, name: "Fornecedores e Produtos", flow: "SAIDA" },
      });
      const hoje = todayDateStrInSalonTZ();
      await prisma.financeTransaction.create({
        data: {
          salonId: tenant.salonId,
          date: new Date(`${hoje}T00:00:00.000Z`),
          competencia: competenciaFromDate(hoje),
          description: `Compra de ${product.name}`,
          amount: total,
          flow: "SAIDA",
          owner: "PJ",
          status: "PAGO",
          categoryId: categoria?.id ?? null,
          source: "MANUAL",
        },
      });
      revalidatePath("/financeiro");
    }
  }

  revalidatePath("/estoque");
  return { ok: true };
}
