-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "commissionPaid" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "commissionPct" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "salonId" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_salonId_idx" ON "Product"("salonId");

-- CreateIndex
CREATE INDEX "StockMovement_salonId_createdAt_idx" ON "StockMovement"("salonId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
