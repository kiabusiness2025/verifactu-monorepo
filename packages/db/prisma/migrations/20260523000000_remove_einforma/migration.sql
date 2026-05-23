-- Remove eInforma integration
ALTER TABLE "tenant_profiles"
  DROP COLUMN IF EXISTS "einforma_last_sync_at",
  DROP COLUMN IF EXISTS "einforma_tax_id_verified",
  DROP COLUMN IF EXISTS "einforma_raw";

DROP TABLE IF EXISTS "einforma_lookups";
