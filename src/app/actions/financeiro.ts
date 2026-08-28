"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { ensureDefaultCategories } from "@/lib/finance/categories";
import { parseStatementFile, StatementParseError } from "@/lib/finance/parse";
import { suggestCategory } from "@/lib/finance/classify";
import type { FinanceFlow, FinanceOwner } from "@prisma/client";

// ─── Categorias ──────────────────────────────────────────────────────────
export async function listCategories() {
  const tenant = await requireTenant();
  await ensureDefaultCategories(tenant.salonId);
  return prisma.financeCategory.findMany({
    where: { salonId: tenant.salonId },
    orderBy: [{ flow: "asc" }, { name: "asc" }],
  });
}

export async function createCategory(formData: FormData) {
  const tenant = await requireTenant();

  const name = String(formData.get("name") ?? "").trim();
  const flow = String(formData.get("flow") ?? "") as FinanceFlow;
  const ownerRaw = String(formData.get("owner") ?? "");
  const owner = ownerRaw === "PF" || ownerRaw === "PJ" ? (ownerRaw as FinanceOwner) : null;

  if (!name) throw new Error("Nome da categoria é obrigatório.");
  if (flow !== "ENTRADA" && flow !== "SAIDA") throw new Error("Tipo de categoria inválido.");

  await prisma.financeCategory.create({
    data: { salonId: tenant.salonId, name, flow, owner, keywords: "" },
  });

  revalidatePath("/financeiro");
}

export async function deleteCategory(id: string) {
  const tenant = await requireTenant();

  const category = await prisma.financeCategory.findFirst({ where: { id, salonId: tenant.salonId } });
  if (!category) return;
  if (category.isSystem) throw new Error("Categorias padrão do sistema não podem ser apagadas.");

  await prisma.financeCategory.deleteMany({ where: { id, salonId: tenant.salonId } });
  revalidatePath("/financeiro");
}

// ─── Lançamentos manuais ───────────────────────────────────────────────────
export async function createTransaction(formData: FormData) {
  const tenant = await requireTenant();

  const description = String(formData.get("description") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "");
  const amountRaw = String(formData.get("amount") ?? "0").replace(",", ".");
  const flow = String(formData.get("flow") ?? "") as FinanceFlow;
  const owner = String(formData.get("owner") ?? "") as FinanceOwner;
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim() || null;
  const counterparty = String(formData.get("counterparty") ?? "").trim() || null;

  if (!description) throw new Error("Descrição é obrigatória.");
  if (!dateRaw) throw new Error("Data é obrigatória.");
  if (flow !== "ENTRADA" && flow !== "SAIDA") throw new Error("Tipo inválido.");
  if (owner !== "PF" && owner !== "PJ") throw new Error("É preciso dizer se é PF ou PJ.");

  const amount = Math.abs(Number(amountRaw));
  if (!amount || Number.isNaN(amount)) throw new Error("Valor inválido.");

  await prisma.financeTransaction.create({
    data: {
      salonId: tenant.salonId,
      date: new Date(`${dateRaw}T00:00:00.000Z`),
      description,
      amount,
      flow,
      owner,
      categoryId,
      paymentMethod,
      counterparty,
      source: "MANUAL",
    },
  });

  revalidatePath("/financeiro");
}

export async function updateTransaction(id: string, formData: FormData) {
  const tenant = await requireTenant();

  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const owner = String(formData.get("owner") ?? "") as FinanceOwner;
  const description = String(formData.get("description") ?? "").trim();

  if (owner !== "PF" && owner !== "PJ") throw new Error("É preciso dizer se é PF ou PJ.");
  if (!description) throw new Error("Descrição é obrigatória.");

  await prisma.financeTransaction.updateMany({
    where: { id, salonId: tenant.salonId },
    data: { categoryId, owner, description },
  });

  revalidatePath("/financeiro");
}

export async function deleteTransaction(id: string) {
  const tenant = await requireTenant();
  await prisma.financeTransaction.deleteMany({ where: { id, salonId: tenant.salonId } });
  revalidatePath("/financeiro");
}

// ─── Importação de extrato ─────────────────────────────────────────────────
export type PreviewRow = {
  date: string; // ISO
  description: string;
  amount: number;
  flow: FinanceFlow;
  externalId: string;
  suggestedCategoryId: string | null;
  isDuplicate: boolean;
};

export type PreviewResult =
  | { ok: true; rows: PreviewRow[] }
  | { ok: false; error: string };

export async function previewStatement(formData: FormData): Promise<PreviewResult> {
  const tenant = await requireTenant();
  await ensureDefaultCategories(tenant.salonId);

  const file = formData.get("file");
  const ownerRaw = String(formData.get("owner") ?? "");
  const owner = ownerRaw === "PF" || ownerRaw === "PJ" ? (ownerRaw as FinanceOwner) : null;

  if (!(file instanceof File)) return { ok: false, error: "Selecione um arquivo de extrato." };
  if (!owner) return { ok: false, error: "Diga se esse extrato é da conta PF ou PJ." };

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "Não conseguimos ler o arquivo enviado." };
  }

  let parsed;
  try {
    parsed = parseStatementFile(file.name, text);
  } catch (e) {
    const message = e instanceof StatementParseError ? e.message : "Não conseguimos entender esse arquivo. Confira se é um extrato OFX ou CSV exportado do seu banco.";
    return { ok: false, error: message };
  }

  if (parsed.length === 0) {
    return { ok: false, error: "Nenhum lançamento foi encontrado nesse arquivo." };
  }

  const categories = await prisma.financeCategory.findMany({ where: { salonId: tenant.salonId } });
  const existingIds = new Set(
    (
      await prisma.financeTransaction.findMany({
        where: { salonId: tenant.salonId, externalId: { in: parsed.map((r) => r.externalId) } },
        select: { externalId: true },
      })
    ).map((t) => t.externalId)
  );

  const rows: PreviewRow[] = parsed.map((r) => ({
    date: r.date.toISOString(),
    description: r.description,
    amount: r.amount,
    flow: r.flow,
    externalId: r.externalId,
    suggestedCategoryId: suggestCategory(r.description, r.flow, owner, categories),
    isDuplicate: existingIds.has(r.externalId),
  }));

  return { ok: true, rows };
}

export type ConfirmImportInput = {
  owner: FinanceOwner;
  bankLabel: string;
  fileName: string;
  rows: {
    date: string;
    description: string;
    amount: number;
    flow: FinanceFlow;
    externalId: string;
    categoryId: string | null;
  }[];
};

export async function confirmImport(input: ConfirmImportInput) {
  const tenant = await requireTenant();

  const rows = input.rows;
  if (!rows || rows.length === 0) throw new Error("Nenhuma linha para importar.");

  const bankImport = await prisma.bankImport.create({
    data: {
      salonId: tenant.salonId,
      fileName: input.fileName,
      owner: input.owner,
      bankLabel: input.bankLabel || null,
      rowCount: rows.length,
    },
  });

  await prisma.financeTransaction.createMany({
    data: rows.map((r) => ({
      salonId: tenant.salonId,
      importId: bankImport.id,
      date: new Date(r.date),
      description: r.description,
      amount: r.amount,
      flow: r.flow,
      owner: input.owner,
      categoryId: r.categoryId,
      source: "IMPORTACAO" as const,
      externalId: r.externalId,
    })),
    skipDuplicates: true, // linhas já importadas antes (mesmo externalId) são simplesmente ignoradas
  });

  revalidatePath("/financeiro");
  return { importedCount: rows.length, importId: bankImport.id };
}
