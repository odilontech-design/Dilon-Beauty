-- CreateEnum
CREATE TYPE "FinanceOwner" AS ENUM ('PJ', 'PF');

-- CreateEnum
CREATE TYPE "FinanceFlow" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "FinanceSource" AS ENUM ('MANUAL', 'IMPORTACAO');

-- CreateTable
CREATE TABLE "FinanceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flow" "FinanceFlow" NOT NULL,
    "owner" "FinanceOwner",
    "keywords" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "salonId" TEXT NOT NULL,

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "owner" "FinanceOwner" NOT NULL,
    "bankLabel" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salonId" TEXT NOT NULL,

    CONSTRAINT "BankImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "flow" "FinanceFlow" NOT NULL,
    "owner" "FinanceOwner" NOT NULL,
    "source" "FinanceSource" NOT NULL DEFAULT 'MANUAL',
    "paymentMethod" TEXT,
    "counterparty" TEXT,
    "notes" TEXT,
    "externalId" TEXT,
    "categoryId" TEXT,
    "importId" TEXT,
    "salonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceCategory_salonId_idx" ON "FinanceCategory"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCategory_salonId_name_flow_key" ON "FinanceCategory"("salonId", "name", "flow");

-- CreateIndex
CREATE INDEX "BankImport_salonId_idx" ON "BankImport"("salonId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_salonId_date_idx" ON "FinanceTransaction"("salonId", "date");

-- CreateIndex
CREATE INDEX "FinanceTransaction_salonId_owner_idx" ON "FinanceTransaction"("salonId", "owner");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceTransaction_salonId_externalId_key" ON "FinanceTransaction"("salonId", "externalId");

-- AddForeignKey
ALTER TABLE "FinanceCategory" ADD CONSTRAINT "FinanceCategory_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankImport" ADD CONSTRAINT "BankImport_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "BankImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
