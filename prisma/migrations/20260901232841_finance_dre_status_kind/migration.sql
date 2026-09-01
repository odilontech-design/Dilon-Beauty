-- CreateEnum
CREATE TYPE "FinanceCategoryKind" AS ENUM ('RECEITA', 'FIXA', 'VARIAVEL', 'IMPOSTO', 'DIVIDA', 'RETIRADA');

-- CreateEnum
CREATE TYPE "FinanceStatus" AS ENUM ('PAGO', 'PENDENTE');

-- AlterTable
ALTER TABLE "FinanceCategory" ADD COLUMN     "kind" "FinanceCategoryKind" NOT NULL DEFAULT 'VARIAVEL';

-- AlterTable
ALTER TABLE "FinanceTransaction" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "status" "FinanceStatus" NOT NULL DEFAULT 'PAGO';

-- AlterTable
ALTER TABLE "Salon" ADD COLUMN     "metaCaixa" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "FinanceTransaction_salonId_status_dueDate_idx" ON "FinanceTransaction"("salonId", "status", "dueDate");

-- Classifica as categorias que já existem. Sem isso todas ficariam como
-- "variável" e o lucro real sairia errado logo na primeira tela: imposto
-- contaria como custo variável e o pró-labore entraria como despesa do
-- negócio, quando na verdade é distribuição do lucro.
UPDATE "FinanceCategory" SET "kind" = 'RECEITA' WHERE "flow" = 'ENTRADA';

UPDATE "FinanceCategory" SET "kind" = 'FIXA'
 WHERE "flow" = 'SAIDA' AND "name" IN (
   'Aluguel e Contas Fixas', 'Funcionários e Comissões', 'Casa e Moradia', 'Educação'
 );

UPDATE "FinanceCategory" SET "kind" = 'IMPOSTO'
 WHERE "flow" = 'SAIDA' AND "name" = 'Impostos e Taxas';

UPDATE "FinanceCategory" SET "kind" = 'DIVIDA'
 WHERE "flow" = 'SAIDA' AND "name" = 'Dívidas e Cartão';

UPDATE "FinanceCategory" SET "kind" = 'RETIRADA'
 WHERE "flow" = 'SAIDA' AND "name" = 'Pró-labore / Retirada dos Sócios';
