-- Ensure Holded verified identities storage supports remembered onboarding prefill.
-- Idempotent by design to run safely across environments.

CREATE TABLE IF NOT EXISTS holded_verified_email_identities (
  uid text NOT NULL,
  email text NOT NULL,
  auth_method text NULL,
  first_name text NULL,
  last_name text NULL,
  full_name text NULL,
  tenant_id text NULL,
  onboarding_prefill_json jsonb NULL,
  verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (uid, email)
);

ALTER TABLE holded_verified_email_identities
  ADD COLUMN IF NOT EXISTS auth_method text NULL;

ALTER TABLE holded_verified_email_identities
  ADD COLUMN IF NOT EXISTS first_name text NULL;

ALTER TABLE holded_verified_email_identities
  ADD COLUMN IF NOT EXISTS last_name text NULL;

ALTER TABLE holded_verified_email_identities
  ADD COLUMN IF NOT EXISTS full_name text NULL;

ALTER TABLE holded_verified_email_identities
  ADD COLUMN IF NOT EXISTS tenant_id text NULL;

ALTER TABLE holded_verified_email_identities
  ADD COLUMN IF NOT EXISTS onboarding_prefill_json jsonb NULL;

ALTER TABLE holded_verified_email_identities
  ADD COLUMN IF NOT EXISTS verified_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE holded_verified_email_identities
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS holded_verified_email_identities_email_idx
  ON holded_verified_email_identities (email);
