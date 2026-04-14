DO $$
BEGIN
  CREATE TYPE membership_side AS ENUM ('client', 'advisor');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "memberships"
  ADD COLUMN IF NOT EXISTS "side" membership_side,
  ADD COLUMN IF NOT EXISTS "confirmed_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "disabled_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "metadata_json" jsonb;

CREATE INDEX IF NOT EXISTS "memberships_tenant_id_side_status_idx"
  ON "memberships"("tenant_id", "side", "status");
