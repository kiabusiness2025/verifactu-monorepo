-- Backfill any remaining legacy Holded dashboard connections into external_connections.
-- Existing external rows remain authoritative and are never overwritten here.

INSERT INTO external_connections (
  tenant_id,
  provider,
  channel_key,
  credential_type,
  api_key_enc,
  scopes_granted,
  connection_status,
  last_error,
  connected_at,
  last_validated_at,
  last_sync_at,
  created_at,
  updated_at
)
SELECT
  tenant_id,
  'holded',
  'dashboard',
  'api_key',
  api_key_enc,
  ARRAY[]::text[],
  CASE
    WHEN status = 'connected' THEN 'connected'
    WHEN status = 'error' THEN 'error'
    WHEN status = 'disconnected' THEN 'disconnected'
    ELSE 'pending'
  END,
  last_error,
  CASE
    WHEN api_key_enc IS NOT NULL AND status <> 'disconnected' THEN created_at
    ELSE NULL
  END,
  CASE
    WHEN api_key_enc IS NOT NULL AND status <> 'disconnected'
      THEN COALESCE(updated_at, last_sync_at, created_at)
    ELSE NULL
  END,
  last_sync_at,
  created_at,
  updated_at
FROM tenant_integrations
WHERE provider = 'accounting_api'
  AND api_key_enc IS NOT NULL
ON CONFLICT (tenant_id, provider, channel_key) DO NOTHING;