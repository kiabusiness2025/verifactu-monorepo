-- AlterTable
ALTER TABLE "tenant_profiles" ADD COLUMN     "capital_social" DECIMAL(65,30),
ADD COLUMN     "cnae_code" TEXT,
ADD COLUMN     "cnae_text" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "legal_form" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "website" TEXT;
