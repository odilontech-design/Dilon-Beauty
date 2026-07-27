import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";

export type TenantSession = {
  userId: string;
  userName: string;
  salonId: string;
  salonName: string;
  salonPlan: string;
  role: string;
};

/**
 * Toda página ou server action que acessa dados de um salão DEVE
 * chamar essa função e usar o salonId retornado em todo `where` do Prisma.
 * Nunca aceite um salonId vindo de props/query string do cliente —
 * isso abriria a porta pra um salão ler dados de outro.
 */
export async function requireTenant(): Promise<TenantSession> {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).salonId) {
    redirect("/login");
  }

  const u = session.user as any;
  return {
    userId: u.id ?? u.sub,
    userName: u.name,
    salonId: u.salonId,
    salonName: u.salonName,
    salonPlan: u.salonPlan,
    role: u.role,
  };
}
