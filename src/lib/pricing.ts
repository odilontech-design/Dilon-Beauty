import type { Plan } from "@prisma/client";

// Preços mensais por plano — usado só pra calcular MRR no painel /admin.
// Atualize aqui se os preços em dilontech.com.br/beauty mudarem.
export const PLAN_PRICES: Record<Plan, number> = {
  STARTER: 147,
  PROFISSIONAL: 297,
  CLINIC: 597,
};
