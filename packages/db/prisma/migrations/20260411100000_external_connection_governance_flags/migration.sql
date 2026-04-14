DO $$
BEGIN
  CREATE TYPE ownership_status AS ENUM ('confirmed', 'pending_confirmation', 'third_party_managed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "external_connections"
  ADD COLUMN IF NOT EXISTS "origin_channel" text,
  ADD COLUMN IF NOT EXISTS "ownership_status" ownership_status,
  ADD COLUMN IF NOT EXISTS "managed_by_third_party" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "client_admin_gap" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "high_governance_risk" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "under_claim_review" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "technical_operator_user_id" text,
  ADD COLUMN IF NOT EXISTS "disconnected_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "revoked_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "company_identity_json" jsonb,
  ADD COLUMN IF NOT EXISTS "governance_updated_at" timestamptz;

DO $$
BEGIN
  ALTER TABLE "external_connections"
    ADD CONSTRAINT "external_connections_technical_operator_user_id_fkey"
    FOREIGN KEY ("technical_operator_user_id") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "external_connections_tenant_provider_connection_status_idx"
  ON "external_connections"("tenant_id", "provider", "connection_status");

CREATE INDEX IF NOT EXISTS "external_connections_provider_provider_account_id_idx"
  ON "external_connections"("provider", "provider_account_id");

CREATE INDEX IF NOT EXISTS "external_connections_tenant_managed_by_third_party_idx"
  ON "external_connections"("tenant_id", "managed_by_third_party");

CREATE INDEX IF NOT EXISTS "external_connections_tenant_client_admin_gap_idx"
  ON "external_connections"("tenant_id", "client_admin_gap");

CREATE INDEX IF NOT EXISTS "external_connections_tenant_high_governance_risk_idx"
  ON "external_connections"("tenant_id", "high_governance_risk");

CREATE INDEX IF NOT EXISTS "external_connections_tenant_under_claim_review_idx"
  ON "external_connections"("tenant_id", "under_claim_review");

CREATE INDEX IF NOT EXISTS "external_connections_technical_operator_user_idx"
  ON "external_connections"("technical_operator_user_id");
