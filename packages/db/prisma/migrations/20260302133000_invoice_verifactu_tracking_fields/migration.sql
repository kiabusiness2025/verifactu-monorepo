-- Persist additional VeriFactu emission tracking fields on invoices.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS verifactu_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_last_error TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_payload_hash TEXT;

CREATE INDEX IF NOT EXISTS invoices_tenant_verifactu_status_idx
  ON invoices(tenant_id, verifactu_status);
