"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { createAdminSession, destroyAdminSession, requireAdmin } from "@/lib/admin-auth";

export type AdminLoginState = { ok: boolean; error?: string };

/**
 * Compara dois segredos sem vazar informação pelo TEMPO da comparação.
 *
 * O `!==` de string para na primeira letra diferente, então uma senha que
 * acerta o começo demora um tiquinho mais que uma que erra de cara. Medindo
 * isso muitas vezes dá pra descobrir a senha letra por letra.
 *
 * Os dois passam por SHA-256 antes porque timingSafeEqual exige buffers do
 * mesmo tamanho — e comparar o tamanho antes vazaria justamente o que se quer
 * esconder. Com o hash, a comparação sempre roda sobre 32 bytes.
 */
function conferirEmTempoConstante(digitada: string, esperada: string): boolean {
  const a = crypto.createHash("sha256").update(digitada, "utf8").digest();
  const b = crypto.createHash("sha256").update(esperada, "utf8").digest();
  return crypto.timingSafeEqual(a, b);
}

export async function adminLogin(_prev: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const password = String(formData.get("password") ?? "");
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const emTextoPuro = process.env.ADMIN_PASSWORD;

  if (!hash && !emTextoPuro) {
    return { ok: false, error: "Acesso administrativo não configurado no servidor." };
  }

  // Prefere o hash. O texto puro continua funcionando pra instalação que
  // ainda não migrou: trocar isso de uma vez derrubaria o painel em produção
  // no instante do deploy, antes de alguém ter chance de configurar o hash.
  let confere: boolean;
  if (hash) {
    confere = await bcrypt.compare(password, hash);
  } else {
    console.warn(
      "[admin] ADMIN_PASSWORD em texto puro. Gere um hash com `npm run hash-admin` " +
        "e configure ADMIN_PASSWORD_HASH; depois remova ADMIN_PASSWORD."
    );
    confere = conferirEmTempoConstante(password, emTextoPuro!);
  }

  if (!confere) {
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
