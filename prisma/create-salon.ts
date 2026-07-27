// Script de cadastro manual de um novo salão (cliente fechado).
//
// Uso:
//   npx tsx prisma/create-salon.ts \
//     --name "Salão da Carla" \
//     --slug carla-hair \
//     --email carla@exemplo.com \
//     --whatsapp 5521900000000 \
//     [--password senha-temporaria]   (se omitido, gera uma aleatória)
//
// O slug vira o link público: https://SEU_DOMINIO/agendar/<slug>
// Depois de rodar, envie e-mail + senha temporária pra cabeleireira.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      out[key] = args[i + 1];
      i++;
    }
  }
  return out;
}

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const args = parseArgs();

  const name = args.name;
  const email = args.email?.toLowerCase().trim();
  if (!name || !email) {
    console.error("Uso: npx tsx prisma/create-salon.ts --name \"Nome do Salão\" --email dona@email.com [--slug slug] [--whatsapp 55219...] [--password senha]");
    process.exit(1);
  }

  const slug = args.slug ? slugify(args.slug) : slugify(name);
  const password = args.password || crypto.randomBytes(6).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.salon.findUnique({ where: { slug } });
  if (existing) {
    console.error(`Já existe um salão com o slug "${slug}". Escolha outro com --slug.`);
    process.exit(1);
  }

  const salon = await prisma.salon.create({
    data: {
      name,
      slug,
      plan: "STARTER",
      whatsapp: args.whatsapp,
      users: {
        create: {
          name: args.ownerName || name,
          email,
          passwordHash,
          role: "OWNER",
        },
      },
    },
  });

  console.log("\nSalão criado com sucesso!\n");
  console.log(`  Salão:        ${salon.name} (${salon.id})`);
  console.log(`  Link público: /agendar/${salon.slug}`);
  console.log(`  Login:        ${email}`);
  console.log(`  Senha:        ${password}`);
  console.log("\nPasse esse e-mail/senha pra cabeleireira. Ela deve cadastrar os");
  console.log("próprios profissionais e serviços em Configurações antes de divulgar o link.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
