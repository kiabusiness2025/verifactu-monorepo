-- Add provider discriminator to se_connections
-- Allows the same table to store both Salt Edge ('saltedge') and
-- GoCardless Bank Account Data ('gcbd') connections.
-- Existing rows default to 'saltedge'.

ALTER TABLE "se_connections" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'saltedge';
CREATE INDEX "se_connections_tenant_id_provider_idx" ON "se_connections"("tenant_id", "provider");

-- Make se_customer_id nullable so GoCardless BAD connections
-- (which have no SeCustomer) can be stored in the same table.
ALTER TABLE "se_connections" ALTER COLUMN "se_customer_id" DROP NOT NULL;
