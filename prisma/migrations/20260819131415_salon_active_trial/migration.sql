-- AlterTable
ALTER TABLE "Salon" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);
