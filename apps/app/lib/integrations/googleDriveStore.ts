import { one } from '@/lib/db';

const PROVIDER = 'google_drive';

type IntegrationRow = {
  id: string;
  tenant_id: string;
  provider: string;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  api_key_enc: string | null;
  created_at: string;
  updated_at: string;
};

export async function getGoogleDriveIntegration(tenantId: string) {
  return one<IntegrationRow>(
    `
    SELECT id, tenant_id, provider, status, last_sync_at::text, last_error, api_key_enc, created_at::text, updated_at::text
    FROM tenant_integrations
    WHERE tenant_id = $1 AND provider = $2
    LIMIT 1
    `,
    [tenantId, PROVIDER]
  );
}

export async function upsertGoogleDriveIntegration(args: {
  tenantId: string;
  encryptedPayload: string;
  status: 'connected' | 'error';
  lastError: string | null;
}) {
  const { tenantId, encryptedPayload, status, lastError } = args;
  return one<IntegrationRow>(
    `
    INSERT INTO tenant_integrations (tenant_id, provider, api_key_enc, status, last_sync_at, last_error)
    VALUES ($1, $2, $3, $4, CASE WHEN $4 = 'connected' THEN now() ELSE NULL END, $5)
    ON CONFLICT (tenant_id, provider)
    DO UPDATE SET
      api_key_enc = EXCLUDED.api_key_enc,
      status = EXCLUDED.status,
      last_sync_at = CASE WHEN EXCLUDED.status = 'connected' THEN now() ELSE tenant_integrations.last_sync_at END,
      last_error = EXCLUDED.last_error,
      updated_at = now()
    RETURNING id, tenant_id, provider, status, last_sync_at::text, last_error, api_key_enc, created_at::text, updated_at::text
    `,
    [tenantId, PROVIDER, encryptedPayload, status, lastError]
  );
}

export async function disconnectGoogleDriveIntegration(tenantId: string) {
  return one<IntegrationRow>(
    `
    UPDATE tenant_integrations
    SET status = 'disconnected', api_key_enc = NULL, last_error = NULL, updated_at = now()
    WHERE tenant_id = $1 AND provider = $2
    RETURNING id, tenant_id, provider, status, last_sync_at::text, last_error, api_key_enc, created_at::text, updated_at::text
    `,
    [tenantId, PROVIDER]
  );
}
