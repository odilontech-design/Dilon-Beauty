# Dilon Beauty — Sistema Multi-tenant

Sistema real (não demo) de agendamento e gestão para salões, com isolamento
de dados por cliente (tenant) via login — sem domínio ou subdomínio próprio
por salão.

## Como funciona o multi-tenant

- Cada cliente que fecha contrato vira uma linha na tabela `Salon`.
- Cada usuário (`User`) pertence a exatamente um `Salon` (`salonId`).
- No login, o NextAuth carrega o `salonId` do usuário para dentro da sessão (JWT).
- **Toda** consulta ao banco nas páginas e nas server actions passa pela função
  `requireTenant()` (`src/lib/tenant.ts`), que devolve o `salonId` da sessão atual.
  Esse `salonId` entra em todo `where` do Prisma — é isso que impede um salão
  de ver ou editar dados de outro, mesmo estando todos no mesmo banco.
- Não existe rota que aceite um `salonId` vindo do cliente (query string, body,
  etc.) para decidir de quem são os dados — o `salonId` sempre vem da sessão.

## Setup local

```bash
npm install
cp .env.example .env
# preencha DATABASE_URL com a connection string do Neon
# gere um NEXTAUTH_SECRET com: openssl rand -base64 32

npx prisma migrate dev --name init
npm run db:seed   # cria um salão de teste

npm run dev
```

Login de teste após o seed:
- **E-mail:** dona@salaoexemplo.com.br
- **Senha:** dilon123

## Cadastrando um novo cliente (salão) fechado no evento

Por enquanto o provisionamento é manual — não existe ainda uma tela de
onboarding automático. Para cada cliente fechada:

1. Rode um script (ou insira via Prisma Studio: `npx prisma studio`) criando:
   - 1 `Salon` (nome, slug único, plano)
   - 1 `User` vinculado a esse salão (e-mail + senha temporária)
2. Envie e-mail/WhatsApp com o e-mail de acesso e a senha temporária.
3. Recomendação: adicionar um fluxo de "trocar senha no primeiro acesso"
   antes de escalar esse cadastro para automático.

## Próximos passos sugeridos

- [ ] Tela de onboarding self-service (formulário público que já cria o `Salon` + `User`)
- [ ] "Esqueci minha senha" (reset via e-mail)
- [ ] Página pública de agendamento por slug (`/agendar/[slug]`) para a cliente final
- [ ] Enforcar limites do plano Starter (ex: máx. 3 profissionais) na criação
- [ ] Trocar `passwordHash` temporário por fluxo de convite com definição de senha
