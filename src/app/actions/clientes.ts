"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function createClient(formData: FormData) {
  const tenant = await requireTenant();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  await prisma.client.create({
    data: { name, phone, salonId: tenant.salonId },
  });

  revalidatePath("/clientes");
}

export async function updateClient(id: string, formData: FormData) {
  const tenant = await requireTenant();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");

  // updateMany com salonId no where impede editar cliente de outro salão
  // mesmo que alguém descubra o id.
  await prisma.client.updateMany({
    where: { id, salonId: tenant.salonId },
    data: { name, phone, notes },
  });

  revalidatePath("/clientes");
  revalidatePath("/agenda");
}
