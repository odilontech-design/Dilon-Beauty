"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { hasConflict } from "@/lib/scheduling";
import { calcularComissao } from "@/lib/comissoes";
import { revalidatePath } from "next/cache";

export async function createAppointment(formData: FormData) {
  const tenant = await requireTenant();

  const clientId = String(formData.get("clientId"));
  const professionalId = String(formData.get("professionalId"));
  const serviceId = String(formData.get("serviceId"));
  const date = String(formData.get("date"));
  const time = String(formData.get("time"));

  // Confere que cliente/profissional/serviço pertencem ao MESMO salão
  // da sessão — impede que alguém injete um id de outro tenant no form.
  const [client, professional, service] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, salonId: tenant.salonId } }),
    prisma.professional.findFirst({ where: { id: professionalId, salonId: tenant.salonId, active: true } }),
    prisma.service.findFirst({ where: { id: serviceId, salonId: tenant.salonId, active: true } }),
  ]);
  if (!client || !professional || !service) {
    throw new Error("Registro inválido para este salão.");
  }

  await prisma.appointment.create({
    data: {
      salonId: tenant.salonId,
      clientId: client.id,
      professionalId: professional.id,
      serviceId: service.id,
      date: new Date(date),
      time,
      price: service.price,
      status: "AGUARDANDO",
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  const tenant = await requireTenant();

  // Ao concluir, congela a comissão com o percentual vigente hoje — igual ao
  // preço. Se o salão mudar o percentual mês que vem, o que já foi atendido
  // continua valendo o combinado da época.
  let commissionAmount: number | undefined;
  if (status === "CONCLUIDO") {
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, salonId: tenant.salonId },
      include: { professional: true, service: true },
    });
    if (appt) {
      commissionAmount = calcularComissao(
        appt.price,
        appt.professional.commissionPct,
        appt.service.commissionPct
      );
    }
  }

  // O `updateMany` com salonId no where é o que impede um usuário de
  // atualizar um agendamento de outro salão mesmo sabendo o id dele.
  await prisma.appointment.updateMany({
    where: { id: appointmentId, salonId: tenant.salonId },
    data: {
      status: status as any,
      ...(commissionAmount !== undefined ? { commissionAmount } : {}),
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");
  revalidatePath("/comissoes");
}

export type RescheduleState = { ok: boolean; error?: string };

export async function rescheduleAppointment(
  appointmentId: string,
  _prev: RescheduleState,
  formData: FormData
): Promise<RescheduleState> {
  const tenant = await requireTenant();

  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  if (!date || !time) return { ok: false, error: "Data e hora são obrigatórios." };

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return { ok: false, error: "Data inválida." };

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, salonId: tenant.salonId },
    include: { service: true },
  });
  if (!appt) return { ok: false, error: "Agendamento não encontrado." };

  const conflict = await hasConflict(
    tenant.salonId,
    appt.professionalId,
    parsedDate,
    time,
    appt.service.durationMin,
    appt.id
  );
  if (conflict) return { ok: false, error: "Esse profissional já tem outro agendamento nesse horário." };

  await prisma.appointment.updateMany({
    where: { id: appointmentId, salonId: tenant.salonId },
    data: { date: parsedDate, time },
  });

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");

  return { ok: true };
}
