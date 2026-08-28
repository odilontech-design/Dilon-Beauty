import type { FinanceFlow, FinanceOwner } from "@prisma/client";

export type ClassifiableCategory = {
  id: string;
  name: string;
  flow: FinanceFlow;
  owner: FinanceOwner | null;
  keywords: string | null;
};

export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .trim();
}

// Sugere uma categoria pra um lançamento com base nas palavras-chave
// cadastradas. Prioriza uma categoria com keyword batendo na descrição;
// se nenhuma bater, cai numa categoria "genérica" (sem keywords) do mesmo
// fluxo/dono, que existe pra sempre sobrar um destino — nunca deixamos o
// usuário sem sugestão nenhuma.
export function suggestCategory(
  description: string,
  flow: FinanceFlow,
  owner: FinanceOwner,
  categories: ClassifiableCategory[]
): string | null {
  const normalizedDesc = normalizeText(description);
  const candidates = categories.filter((c) => c.flow === flow && (c.owner === owner || c.owner === null));

  for (const category of candidates) {
    if (!category.keywords) continue;
    const keywords = category.keywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (keywords.some((k) => normalizedDesc.includes(k))) {
      return category.id;
    }
  }

  const fallback = candidates.find((c) => !c.keywords || c.keywords.trim() === "");
  return fallback?.id ?? candidates[0]?.id ?? null;
}
