-- AlterTable: add Isaak public feature flag fields to tenants
ALTER TABLE "tenants" ADD COLUMN "isaak_public_enabled" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "tenants" ADD COLUMN "isaak_public_slug" VARCHAR(80);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_isaak_public_slug_key" ON "tenants"("isaak_public_slug");
