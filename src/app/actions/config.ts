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
