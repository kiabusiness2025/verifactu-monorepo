import { query, one } from '@/lib/db';

export type HoldedIntegrationStatus = {
  id: string;
  tenant_id: string;
  provider: string;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export async function getHoldedIntegration(tenantId: string) {
  return one<HoldedIntegrationStatus>(
    `
    SELECT id, tenant_id, provider, status, last_sync_at::text, last_error, created_at::text, updated_at::text
    FROM tenant_integrations
    WHERE tenant_id = $1 AND provider = 'holded'
    LIMIT 1
    `,
    [tenantId]
  );
}

export async function listTenantIntegrations(tenantId: string) {
  return query<HoldedIntegrationStatus>(
    `
    SELECT id, tenant_id, provider, status, last_sync_at::text, last_error, created_at::text, updated_at::text
    FROM tenant_integrations
    WHERE tenant_id = $1
    ORDER BY provider ASC
    `,
    [tenantId]
  );
}

export async function upsertHoldedIntegration(args: {
  tenantId: string;
  apiKeyEnc: string;
  status: 'connected' | 'error';
  lastError: string | null;
}) {
  const { tenantId, apiKeyEnc, status, lastError } = args;
  return one<HoldedIntegrationStatus>(
    `
    INSERT INTO tenant_integrations (tenant_id, provider, api_key_enc, status, last_sync_at, last_error)
    VALUES ($1, 'holded', $2, $3, CASE WHEN $3 = 'connected' THEN now() ELSE NULL END, $4)
    ON CONFLICT (tenant_id, provider)
    DO UPDATE SET
      api_key_enc = EXCLUDED.api_key_enc,
      status = EXCLUDED.status,
      last_sync_at = CASE WHEN EXCLUDED.status = 'connected' THEN now() ELSE tenant_integrations.last_sync_at END,
      last_error = EXCLUDED.last_error,
      updated_at = now()
    RETURNING id, tenant_id, provider, status, last_sync_at::text, last_error, created_at::text, updated_at::text
    `,
    [tenantId, apiKeyEnc, status, lastError]
  );
}

export async function disconnectHoldedIntegration(tenantId: string) {
  return one<HoldedIntegrationStatus>(
    `
    UPDATE tenant_integrations
    SET status = 'disconnected', api_key_enc = NULL, last_error = NULL, updated_at = now()
    WHERE tenant_id = $1 AND provider = 'holded'
    RETURNING id, tenant_id, provider, status, last_sync_at::text, last_error, created_at::text, updated_at::text
    `,
    [tenantId]
  );
}

export async function createSyncOutbox(args: {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: 'upsert' | 'delete';
  payload: unknown;
}) {
  const { tenantId, entityType, entityId, action, payload } = args;
  return one<{ id: string }>(
    `
    INSERT INTO sync_outbox (tenant_id, provider, entity_type, entity_id, action, payload, status)
    VALUES ($1, 'holded', $2, $3, $4, $5::jsonb, 'pending')
    RETURNING id
    `,
    [tenantId, entityType, entityId, action, JSON.stringify(payload)]
  );
}

export async function listSyncLogs(tenantId: string, limit: number, cursor?: string | null) {
  const params: unknown[] = [tenantId, limit];
  const whereCursor = cursor ? ' AND id < $3' : '';
  if (cursor) params.push(cursor);

  return query<{
    id: string;
    outbox_id: string | null;
    level: string;
    message: string;
    data: unknown;
    created_at: string;
  }>(
    `
    SELECT id, outbox_id, level, message, data, created_at::text
    FROM sync_logs
    WHERE tenant_id = $1 AND provider = 'holded' ${whereCursor}
    ORDER BY created_at DESC
    LIMIT $2
    `,
    params
  );
}

export async function appendSyncLog(args: {
  tenantId: string;
  outboxId?: string | null;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}) {
  return one<{ id: string }>(
    `
    INSERT INTO sync_logs (tenant_id, provider, outbox_id, level, message, data)
    VALUES ($1, 'holded', $2, $3, $4, $5::jsonb)
    RETURNING id
    `,
    [args.tenantId, args.outboxId ?? null, args.level, args.message, JSON.stringify(args.data ?? null)]
  );
}

export async function getPendingOutbox(tenantId: string, max = 50) {
  return query<{
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    payload: unknown;
    attempts: number;
  }>(
    `
    SELECT id, entity_type, entity_id, action, payload, attempts
    FROM sync_outbox
    WHERE tenant_id = $1
      AND provider = 'holded'
      AND status IN ('pending', 'error')
      AND next_run_at <= now()
    ORDER BY created_at ASC
    LIMIT $2
    `,
    [tenantId, max]
  );
}

export async function markOutboxDone(id: string) {
  await query(
    `
    UPDATE sync_outbox
    SET status = 'done', attempts = attempts + 1, last_error = NULL, updated_at = now()
    WHERE id = $1
    `,
    [id]
  );
}

export async function markOutboxError(id: string, error: string) {
  await query(
    `
    UPDATE sync_outbox
    SET status = 'error', attempts = attempts + 1, last_error = $2,
        next_run_at = now() + ((LEAST(attempts + 1, 6) * 30) || ' seconds')::interval,
        updated_at = now()
    WHERE id = $1
    `,
    [id, error.slice(0, 1000)]
  );
}

export async function touchIntegrationSyncOk(tenantId: string) {
  await query(
    `
    UPDATE tenant_integrations
    SET status = 'connected', last_sync_at = now(), last_error = NULL, updated_at = now()
    WHERE tenant_id = $1 AND provider = 'holded'
    `,
    [tenantId]
  );
}

export async function setIntegrationError(tenantId: string, error: string) {
  await query(
    `
    UPDATE tenant_integrations
    SET status = 'error', last_error = $2, updated_at = now()
    WHERE tenant_id = $1 AND provider = 'holded'
    `,
    [tenantId, error.slice(0, 1000)]
  );
}
