DO $$
BEGIN
  CREATE TYPE claim_type AS ENUM ('control', 'advisor_governance');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE claim_status AS ENUM (
    'submitted',
    'acknowledged',
    'under_review',
    'awaiting_response',
    'resolved_approved',
    'resolved_rejected',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "claim_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "connection_id" uuid NOT NULL REFERENCES "external_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "created_by_user_id" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "claim_type" claim_type NOT NULL,
  "status" claim_status NOT NULL DEFAULT 'submitted',
  "reason" text NOT NULL,
  "scope" text,
  "requires_internal_review" boolean NOT NULL DEFAULT true,
  "resolved_by_user_id" text REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "resolved_at" timestamptz,
  "outcome" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "claim_cases_connection_id_status_idx"
  ON "claim_cases"("connection_id", "status");

CREATE INDEX IF NOT EXISTS "claim_cases_created_by_user_id_status_idx"
  ON "claim_cases"("created_by_user_id", "status");

CREATE INDEX IF NOT EXISTS "claim_cases_claim_type_status_idx"
  ON "claim_cases"("claim_type", "status");

CREATE TABLE IF NOT EXISTS "claim_resolutions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "claim_case_id" uuid NOT NULL REFERENCES "claim_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "actor_user_id" text REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "action" text NOT NULL,
  "previous_status" claim_status,
  "next_status" claim_status NOT NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "claim_resolutions_claim_case_id_created_at_idx"
  ON "claim_resolutions"("claim_case_id", "created_at");
