"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
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
    prisma.professional.findFirst({ where: { id: professionalId, salonId: tenant.salonId } }),
    prisma.service.findFirst({ where: { id: serviceId, salonId: tenant.salonId } }),
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

  // O `updateMany` com salonId no where é o que impede um usuário de
  // atualizar um agendamento de outro salão mesmo sabendo o id dele.
  await prisma.appointment.updateMany({
    where: { id: appointmentId, salonId: tenant.salonId },
    data: { status: status as any },
  });

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/financeiro");
}
