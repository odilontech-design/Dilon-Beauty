import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { encode, decode } from "next-auth/jwt";

// Autenticação do painel /admin é DELIBERADAMENTE separada do sistema de
// login dos salões (NextAuth + User/Salon) — é uma senha única (sua, do
// dono da plataforma), guardada só em variável de ambiente, sem nenhum
// vínculo com um Salon ou User. Isso evita qualquer risco de essa área
// "global" (que lista todos os salões) se misturar com o isolamento por
// tenant usado no resto do app.
const COOKIE_NAME = "dilon_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8h

function secret() {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET não configurado.");
  return s;
}

export async function createAdminSession() {
  const token = await encode({ token: { admin: true }, secret: secret(), maxAge: MAX_AGE_SECONDS });
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroyAdminSession() {
  cookies().delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const decoded = await decode({ token, secret: secret() });
    return decoded?.admin === true;
  } catch {
    return false;
  }
}

export async function requireAdmin() {
  const ok = await isAdminAuthenticated();
  if (!ok) redirect("/admin/login");
}
