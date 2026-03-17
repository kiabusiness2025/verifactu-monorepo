-- Sprint 1: Accounting API integration backbone + AEAT expense metadata.

ALTER TABLE expense_records
  ADD COLUMN IF NOT EXISTS doc_type TEXT NOT NULL DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS tax_category TEXT NOT NULL DEFAULT 'iva_deducible',
  ADD COLUMN IF NOT EXISTS aeat_concept TEXT,
  ADD COLUMN IF NOT EXISTS aeat_key TEXT;

CREATE TABLE IF NOT EXISTS tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key_enc TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_integrations_tenant_provider_key
  ON tenant_integrations(tenant_id, provider);

CREATE INDEX IF NOT EXISTS tenant_integrations_tenant_provider_idx
  ON tenant_integrations(tenant_id, provider);

CREATE TABLE IF NOT EXISTS integration_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  local_id TEXT NOT NULL,
  remote_id TEXT NOT NULL,
  hash TEXT,
  last_pushed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_maps_local_unique
  ON integration_maps(tenant_id, provider, entity_type, local_id);

CREATE UNIQUE INDEX IF NOT EXISTS integration_maps_remote_unique
  ON integration_maps(tenant_id, provider, entity_type, remote_id);

CREATE INDEX IF NOT EXISTS integration_maps_lookup_idx
  ON integration_maps(tenant_id, provider, entity_type);

CREATE TABLE IF NOT EXISTS sync_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_outbox_schedule_idx
  ON sync_outbox(tenant_id, provider, status, next_run_at);

CREATE INDEX IF NOT EXISTS sync_outbox_created_idx
  ON sync_outbox(tenant_id, provider, created_at);

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  outbox_id UUID,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_logs_tenant_provider_created_idx
  ON sync_logs(tenant_id, provider, created_at DESC);

CREATE INDEX IF NOT EXISTS sync_logs_outbox_idx
  ON sync_logs(outbox_id);
