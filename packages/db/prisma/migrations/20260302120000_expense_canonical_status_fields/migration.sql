-- Expense canonical persistence for AEAT/API engines: status, confidence/warnings and snapshots.

ALTER TABLE expense_records
  ADD COLUMN IF NOT EXISTS canonical_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by_user_id TEXT,
  ADD COLUMN IF NOT EXISTS warnings_json JSONB,
  ADD COLUMN IF NOT EXISTS confidence_json JSONB,
  ADD COLUMN IF NOT EXISTS canonical_v2_json JSONB,
  ADD COLUMN IF NOT EXISTS last_confirmed_snapshot_json JSONB;

CREATE INDEX IF NOT EXISTS expense_records_tenant_canonical_status_idx
  ON expense_records(tenant_id, canonical_status);
