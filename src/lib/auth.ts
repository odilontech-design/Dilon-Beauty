import { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { salon: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        // O que entra aqui vira o "token" — é o que define de qual salão
        // (tenant) esse usuário pode enxergar dados. Nunca deixe o cliente
        // escolher o salonId; ele sempre vem do usuário autenticado.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          salonId: user.salonId,
          salonName: user.salon.name,
          salonPlan: user.salon.plan,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.salonId = (user as any).salonId;
        token.salonName = (user as any).salonName;
        token.salonPlan = (user as any).salonPlan;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).salonId = token.salonId;
        (session.user as any).salonName = token.salonName;
        (session.user as any).salonPlan = token.salonPlan;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
