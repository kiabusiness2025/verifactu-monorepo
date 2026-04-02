ALTER TABLE external_connections
  ADD COLUMN IF NOT EXISTS legal_terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS legal_privacy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS legal_acceptance_version text;