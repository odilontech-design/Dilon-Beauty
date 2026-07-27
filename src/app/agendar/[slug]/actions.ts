"use server";

import { prisma } from "@/lib/prisma";
import { hasConflict } from "@/lib/scheduling";
import { getAvailableTimes } from "@/lib/availability";
import { revalidatePath } from "next/cache";

export type PublicBookingState = { ok: boolean; error?: string };

export async function fetchAvailableTimes(
  slug: string,
  professionalId: string,
  serviceId: string,
  date: string
): Promise<string[]> {
  if (!professionalId || !serviceId || !date) return [];

  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return [];

  const [professional, service] = await Promise.all([
    prisma.professional.findFirst({ where: { id: professionalId, salonId: salon.id, active: true } }),
    prisma.service.findFirst({ where: { id: serviceId, salonId: salon.id, active: true } }),
  ]);
  if (!professional || !service) return [];

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return [];

  return getAvailableTimes({
    salonId: salon.id,
    professionalId: professional.id,
    date: parsedDate,
    dateStr: date,
    durationMin: service.durationMin,
    openTime: salon.openTime,
    closeTime: salon.closeTime,
  });
}

export async function createPublicAppointment(
  slug: string,
  _prev: PublicBookingState,
  formData: FormData
): Promise<PublicBookingState> {
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return { ok: false, error: "Salão não encontrado." };

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const professionalId = String(formData.get("professionalId") || "");
  const serviceId = String(formData.get("serviceId") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");

  if (!name || !phone || !professionalId || !serviceId || !date || !time) {
    return { ok: false, error: "Preencha todos os campos." };
  }

  // Confere que profissional/serviço realmente pertencem a este salão —
  // o cliente final só manda ids que a própria página já ofereceu, mas
  // nunca confiamos nisso sem checar contra o slug resolvido no servidor.
  const [professional, service] = await Promise.all([
    prisma.professional.findFirst({ where: { id: professionalId, salonId: salon.id, active: true } }),
    prisma.service.findFirst({ where: { id: serviceId, salonId: salon.id, active: true } }),
  ]);
  if (!professional || !service) {
    return { ok: false, error: "Profissional ou serviço inválido." };
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return { ok: false, error: "Data inválida." };
  }

  // Revalida contra a agenda real no momento do envio — o <select> de
  // horários já só mostra vagas livres, mas isso cobre a corrida de duas
  // clientes escolhendo o mesmo horário ao mesmo tempo.
  const conflict = await hasConflict(salon.id, professional.id, parsedDate, time, service.durationMin);
  if (conflict) {
    return { ok: false, error: "Esse horário acabou de ser preenchido. Escolha outro horário." };
  }

  let client = await prisma.client.findFirst({ where: { salonId: salon.id, phone } });
  if (!client) {
    client = await prisma.client.create({ data: { salonId: salon.id, name, phone } });
  }

  await prisma.appointment.create({
    data: {
      salonId: salon.id,
      clientId: client.id,
      professionalId: professional.id,
      serviceId: service.id,
      date: parsedDate,
      time,
      price: service.price,
      status: "AGUARDANDO",
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/dashboard");

  return { ok: true };
}
