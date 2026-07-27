"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export type SignUpState = { ok: boolean; error?: string };

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

export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const salonName = String(formData.get("salonName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!salonName || !ownerName || !email || !password) {
    return { ok: false, error: "Preencha todos os campos obrigatórios." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "E-mail inválido." };
  }
  if (password.length < 6) {
    return { ok: false, error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Já existe uma conta com esse e-mail." };
  }

  const slug = await uniqueSlugFrom(salonName);
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.salon.create({
    data: {
      name: salonName,
      slug,
      plan: "STARTER",
      whatsapp: whatsapp || null,
      users: {
        create: { name: ownerName, email, passwordHash, role: "OWNER" },
      },
    },
  });

  return { ok: true };
}
