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
