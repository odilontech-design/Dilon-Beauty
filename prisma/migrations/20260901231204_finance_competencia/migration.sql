-- Adiciona a competência (mês de referência, "YYYY-MM") aos lançamentos.
--
-- A coluna é NOT NULL e a tabela já tem dados, então entra em três passos:
-- cria com default temporário, preenche a partir da data do lançamento
-- (é a melhor informação disponível pro histórico) e só então remove o
-- default, pra que daqui pra frente o valor venha sempre explícito do código.

-- AlterTable
ALTER TABLE "FinanceTransaction" ADD COLUMN "competencia" TEXT NOT NULL DEFAULT '';

UPDATE "FinanceTransaction" SET "competencia" = to_char("date", 'YYYY-MM');

ALTER TABLE "FinanceTransaction" ALTER COLUMN "competencia" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "FinanceTransaction_salonId_competencia_idx" ON "FinanceTransaction"("salonId", "competencia");
