-- Sprint 2/3 foundation: tenant fiscal profile, quotes, and bidirectional sync conflicts.

ALTER TABLE tenant_profiles
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_address JSONB,
  ADD COLUMN IF NOT EXISTS tax_regime TEXT,
  ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'EUR';

UPDATE tenant_profiles tp
SET
  tax_id = COALESCE(tp.tax_id, t.nif),
  legal_name = COALESCE(tp.legal_name, t.legal_name, t.name),
  trade_name = COALESCE(tp.trade_name, t.name),
  country = COALESCE(tp.country, 'ES')
FROM tenants t
WHERE t.id = tp.tenant_id;

ALTER TABLE integration_maps
  ADD COLUMN IF NOT EXISTS last_pulled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_remote_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL,
  valid_until DATE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  lines JSONB NOT NULL,
  totals JSONB NOT NULL,
  notes TEXT,
  source TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quotes_tenant_number_unique UNIQUE (tenant_id, number)
);

CREATE INDEX IF NOT EXISTS quotes_tenant_issue_date_idx ON quotes(tenant_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS quotes_tenant_status_idx ON quotes(tenant_id, status);
CREATE INDEX IF NOT EXISTS quotes_customer_idx ON quotes(customer_id);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  local_id TEXT,
  remote_id TEXT,
  reason TEXT NOT NULL,
  local_data JSONB NOT NULL,
  remote_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_conflicts_lookup_idx
  ON sync_conflicts(tenant_id, provider, entity_type, status);

CREATE INDEX IF NOT EXISTS sync_conflicts_created_idx
  ON sync_conflicts(tenant_id, created_at DESC);
