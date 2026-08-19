"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { createAdminSession, destroyAdminSession, requireAdmin } from "@/lib/admin-auth";

export type AdminLoginState = { ok: boolean; error?: string };

export async function adminLogin(_prev: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return { ok: false, error: "ADMIN_PASSWORD não configurado no servidor." };
  }
  if (password !== expected) {
    return { ok: false, error: "Senha incorreta." };
  }

  await createAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export type CreateSalonState = { ok: boolean; error?: string; password?: string; slug?: string };

async function uniqueSlugFrom(name: string): Promise<string> {
  const base = slugify(name) || "salao";
  let slug = base;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.salon.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`;
    n++;
  }
  return slug;
}

export async function adminCreateSalon(_prev: CreateSalonState, formData: FormData): Promise<CreateSalonState> {
  await requireAdmin();

  const salonName = String(formData.get("salonName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const trialDays = Number(formData.get("trialDays") ?? 0);

  if (!salonName || !ownerName || !email) {
    return { ok: false, error: "Nome do salão, nome da dona e e-mail são obrigatórios." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "E-mail inválido." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Já existe uma conta com esse e-mail." };
  }

  const slug = await uniqueSlugFrom(salonName);
  const password = crypto.randomBytes(6).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);
  const trialEndsAt =
    Number.isFinite(trialDays) && trialDays > 0
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      : null;

  await prisma.salon.create({
    data: {
      name: salonName,
      slug,
      plan: "STARTER",
      whatsapp: whatsapp || null,
      trialEndsAt,
      users: {
        create: { name: ownerName, email, passwordHash, role: "OWNER" },
      },
    },
  });

  revalidatePath("/admin");
  return { ok: true, password, slug };
}

export type UpdateSalonState = { ok: boolean; error?: string };

export async function adminUpdateSalon(salonId: string, _prev: UpdateSalonState, formData: FormData): Promise<UpdateSalonState> {
  await requireAdmin();

  const plan = String(formData.get("plan") ?? "");
  const active = formData.get("active") === "on";
  const trialEndsAtRaw = String(formData.get("trialEndsAt") ?? "");

  if (!["STARTER", "PROFISSIONAL", "CLINIC"].includes(plan)) {
    return { ok: false, error: "Plano inválido." };
  }

  let trialEndsAt: Date | null = null;
  if (trialEndsAtRaw) {
    trialEndsAt = new Date(trialEndsAtRaw);
    if (Number.isNaN(trialEndsAt.getTime())) {
      return { ok: false, error: "Data de trial inválida." };
    }
  }

  await prisma.salon.update({
    where: { id: salonId },
    data: { plan: plan as any, active, trialEndsAt },
  });

  revalidatePath("/admin");
  return { ok: true };
}

export type ResetPasswordState = { ok: boolean; error?: string; password?: string };

export async function adminResetPassword(salonId: string, _prev: ResetPasswordState, _formData: FormData): Promise<ResetPasswordState> {
  await requireAdmin();

  const owner = await prisma.user.findFirst({ where: { salonId }, orderBy: { createdAt: "asc" } });
  if (!owner) return { ok: false, error: "Nenhum usuário encontrado para esse salão." };

  const password = crypto.randomBytes(6).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.update({ where: { id: owner.id }, data: { passwordHash } });

  revalidatePath("/admin");
  return { ok: true, password };
}
