import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("dilon123", 10);

  const salon = await prisma.salon.create({
    data: {
      name: "Salão Exemplo",
      slug: "salao-exemplo",
      plan: "STARTER",
      whatsapp: "5521900000000",
      users: {
        create: {
          name: "Dona do Salão",
          email: "dona@salaoexemplo.com.br",
          passwordHash,
          role: "OWNER",
        },
      },
      professionals: {
        create: [{ name: "Ana Paula", role: "Cabeleireira" }],
      },
      services: {
        create: [
          { name: "Corte + Escova", price: 80, durationMin: 60 },
          { name: "Coloração", price: 150, durationMin: 120 },
          { name: "Hidratação", price: 60, durationMin: 45 },
        ],
      },
      clients: {
        create: [
          { name: "Camila Reis", phone: "21 90000-1111" },
          { name: "Beatriz Lima", phone: "21 90000-2222" },
        ],
      },
    },
  });

  console.log("Seed concluído. Login de teste:");
  console.log("  E-mail: dona@salaoexemplo.com.br");
  console.log("  Senha:  dilon123");
  console.log(`  Salão:  ${salon.name} (${salon.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
