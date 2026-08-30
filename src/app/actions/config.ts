"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function createProfessional(formData: FormData) {
  const tenant = await requireTenant();

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  await prisma.professional.create({
    data: { name, role: role || null, salonId: tenant.salonId },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
}

export async function setProfessionalActive(id: string, active: boolean) {
  const tenant = await requireTenant();

  await prisma.professional.updateMany({
    where: { id, salonId: tenant.salonId },
    data: { active },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
}

export async function createService(formData: FormData) {
  const tenant = await requireTenant();

  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price"));
  const durationMin = Number(formData.get("durationMin") || 60);
  if (!name) throw new Error("Nome é obrigatório.");
  if (!Number.isFinite(price) || price < 0) throw new Error("Preço inválido.");

  await prisma.service.create({
    data: { name, price, durationMin, salonId: tenant.salonId },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
}

export async function setServiceActive(id: string, active: boolean) {
  const tenant = await requireTenant();

  await prisma.service.updateMany({
    where: { id, salonId: tenant.salonId },
    data: { active },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function setBusinessHours(formData: FormData) {
  const tenant = await requireTenant();

  const openTime = String(formData.get("openTime") ?? "");
  const closeTime = String(formData.get("closeTime") ?? "");
  if (!HHMM.test(openTime) || !HHMM.test(closeTime) || openTime >= closeTime) {
    throw new Error("Horário de funcionamento inválido.");
  }

  await prisma.salon.update({
    where: { id: tenant.salonId },
    data: { openTime, closeTime },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/agendar");
}

export async function setSalonInfo(formData: FormData) {
  const tenant = await requireTenant();

  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!whatsapp) throw new Error("WhatsApp é obrigatório.");
  if (whatsapp.replace(/\D/g, "").length < 10) {
    throw new Error("Informe um WhatsApp válido, com DDD (ex: 5521900000000).");
  }
  if (!address) throw new Error("Endereço é obrigatório.");

  await prisma.salon.update({
    where: { id: tenant.salonId },
    data: { whatsapp, address },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/agendar");
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

export async function setLogo(formData: FormData) {
  const tenant = await requireTenant();

  const mode = String(formData.get("mode") ?? "url");
  let logoUrl: string;

  if (mode === "file") {
    const file = formData.get("logoFile");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Selecione um arquivo PNG.");
    }
    if (file.type !== "image/png") {
      throw new Error("Envie um arquivo PNG.");
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new Error("O arquivo precisa ter até 2MB.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    logoUrl = `data:image/png;base64,${buffer.toString("base64")}`;
  } else {
    logoUrl = String(formData.get("logoUrl") ?? "").trim();
    if (logoUrl && !/^https?:\/\//.test(logoUrl)) {
      throw new Error("Cole um link que comece com http:// ou https://");
    }
  }

  await prisma.salon.update({
    where: { id: tenant.salonId },
    data: { logoUrl: logoUrl || null },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/agendar");
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
  revalidatePath("/clientes");
  revalidatePath("/financeiro");
}
