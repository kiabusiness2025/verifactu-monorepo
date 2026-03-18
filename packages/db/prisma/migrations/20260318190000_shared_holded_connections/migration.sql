CREATE TABLE IF NOT EXISTS external_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_id text,
  credential_type text NOT NULL DEFAULT 'api_key',
  api_key_enc text,
  scopes_granted text[] NOT NULL DEFAULT ARRAY[]::text[],
  connection_status text NOT NULL DEFAULT 'disconnected',
  connected_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
  connected_at timestamptz,
  last_validated_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS external_connections_tenant_provider_status_idx
  ON external_connections (tenant_id, provider, connection_status);

CREATE INDEX IF NOT EXISTS external_connections_connected_by_user_idx
  ON external_connections (connected_by_user_id);

CREATE TABLE IF NOT EXISTS channel_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  channel_type text NOT NULL,
  channel_subject_id text NOT NULL,
  email text,
  display_name text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_type, channel_subject_id)
);

CREATE INDEX IF NOT EXISTS channel_identities_user_channel_idx
  ON channel_identities (user_id, channel_type);

CREATE INDEX IF NOT EXISTS channel_identities_tenant_channel_idx
  ON channel_identities (tenant_id, channel_type);

CREATE TABLE IF NOT EXISTS external_connection_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES external_connections(id) ON DELETE SET NULL,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  channel_type text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  status text NOT NULL,
  request_payload jsonb,
  response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS external_connection_audit_logs_tenant_created_idx
  ON external_connection_audit_logs (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS external_connection_audit_logs_connection_created_idx
  ON external_connection_audit_logs (connection_id, created_at);

CREATE INDEX IF NOT EXISTS external_connection_audit_logs_user_created_idx
  ON external_connection_audit_logs (user_id, created_at);

CREATE TABLE IF NOT EXISTS external_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES external_connections(id) ON DELETE CASCADE,
  provider text NOT NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  result_summary text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS external_sync_runs_tenant_provider_status_idx
  ON external_sync_runs (tenant_id, provider, status);

CREATE INDEX IF NOT EXISTS external_sync_runs_connection_status_idx
  ON external_sync_runs (connection_id, status);

INSERT INTO external_connections (
  tenant_id, provider, credential_type, api_key_enc, connection_status, connected_at, last_sync_at, created_at, updated_at
)
SELECT
  tenant_id,
  'holded',
  'api_key',
  api_key_enc,
  CASE
    WHEN status = 'connected' THEN 'connected'
    WHEN status = 'error' THEN 'error'
    WHEN status = 'disconnected' THEN 'disconnected'
    ELSE 'pending'
  END,
  CASE WHEN api_key_enc IS NOT NULL THEN created_at ELSE NULL END,
  last_sync_at,
  created_at,
  updated_at
FROM tenant_integrations
WHERE provider = 'accounting_api'
  AND api_key_enc IS NOT NULL
ON CONFLICT (tenant_id, provider) DO NOTHING;
