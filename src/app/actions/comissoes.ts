"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { competenciaToDateRange, formatCompetencia } from "@/lib/finance/competencia";
import { todayDateStrInSalonTZ } from "@/lib/date";
import { calcularComissao } from "@/lib/comissoes";

export async function setCommissionPct(professionalId: string, pct: number) {
  const tenant = await requireTenant();

  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    throw new Error("Percentual precisa estar entre 0 e 100.");
  }

  await prisma.professional.updateMany({
    where: { id: professionalId, salonId: tenant.salonId },
    data: { commissionPct: pct },
  });

  revalidatePath("/comissoes");
  revalidatePath("/configuracoes");
}

export async function setServiceCommissionPct(serviceId: string, pct: number | null) {
  const tenant = await requireTenant();

  if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
    throw new Error("Percentual precisa estar entre 0 e 100.");
  }

  await prisma.service.updateMany({
    where: { id: serviceId, salonId: tenant.salonId },
    data: { commissionPct: pct },
  });

  revalidatePath("/comissoes");
  revalidatePath("/configuracoes");
}

/**
 * Recalcula a comissão dos atendimentos concluídos e ainda NÃO pagos da
 * competência. Serve pra quando o salão acerta o percentual depois de já ter
 * concluído atendimentos — sem isso o dono teria que refazer tudo na mão.
 * Só mexe no que não foi pago: comissão já quitada é história, não se reescreve.
 */
export async function recalcularComissoes(competencia: string) {
  const tenant = await requireTenant();
  const { start, end } = competenciaToDateRange(competencia);

  const appts = await prisma.appointment.findMany({
    where: {
      salonId: tenant.salonId,
      status: "CONCLUIDO",
      commissionPaid: false,
      date: { gte: start, lt: end },
    },
    include: { professional: true, service: true },
  });

  for (const a of appts) {
    const valor = calcularComissao(a.price, a.professional.commissionPct, a.service.commissionPct);
    if (valor !== a.commissionAmount) {
      await prisma.appointment.update({ where: { id: a.id }, data: { commissionAmount: valor } });
    }
  }

  revalidatePath("/comissoes");
  return { atualizados: appts.length };
}

/**
 * Fecha a comissão do profissional no mês: lança a despesa no financeiro e
 * marca os atendimentos como pagos, pra que o mesmo valor não seja cobrado
 * duas vezes.
 */
export async function pagarComissao(professionalId: string, competencia: string) {
  const tenant = await requireTenant();
  const { start, end } = competenciaToDateRange(competencia);

  const [professional, appts] = await Promise.all([
    prisma.professional.findFirst({ where: { id: professionalId, salonId: tenant.salonId } }),
    prisma.appointment.findMany({
      where: {
        salonId: tenant.salonId,
        professionalId,
        status: "CONCLUIDO",
        commissionPaid: false,
        date: { gte: start, lt: end },
      },
      select: { id: true, commissionAmount: true },
    }),
  ]);

  if (!professional) throw new Error("Profissional não encontrado.");

  const total = appts.reduce((s, a) => s + a.commissionAmount, 0);
  if (total <= 0) throw new Error("Não há comissão em aberto pra esse profissional nesse mês.");

  const categoria = await prisma.financeCategory.findFirst({
    where: { salonId: tenant.salonId, name: "Funcionários e Comissões", flow: "SAIDA" },
  });

  await prisma.$transaction([
    prisma.financeTransaction.create({
      data: {
        salonId: tenant.salonId,
        date: new Date(`${todayDateStrInSalonTZ()}T00:00:00.000Z`),
        // A comissão pertence ao mês em que o atendimento foi feito, mesmo que
        // o pagamento saia depois — é exatamente pra isso que a competência existe.
        competencia,
        description: `Comissão ${professional.name} · ${formatCompetencia(competencia)}`,
        amount: total,
        flow: "SAIDA",
        owner: "PJ",
        status: "PAGO",
        categoryId: categoria?.id ?? null,
        counterparty: professional.name,
        source: "MANUAL",
      },
    }),
    prisma.appointment.updateMany({
      where: { id: { in: appts.map((a) => a.id) } },
      data: { commissionPaid: true },
    }),
  ]);

  revalidatePath("/comissoes");
  revalidatePath("/financeiro");

  return { total, quantidade: appts.length };
}
