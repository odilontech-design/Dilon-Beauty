"use server";

import { prisma } from "@/lib/prisma";
import { isSlotTaken } from "@/lib/scheduling";
import { revalidatePath } from "next/cache";

export type PublicBookingState = { ok: boolean; error?: string };

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

  const taken = await isSlotTaken(salon.id, professional.id, parsedDate, time);
  if (taken) {
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
