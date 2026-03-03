import { query, one } from '@/lib/db';

export type AccountingIntegrationStatus = {
  id: string;
  tenant_id: string;
  provider: string;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAccountingIntegration(tenantId: string) {
  return one<AccountingIntegrationStatus>(
    `
    SELECT id, tenant_id, provider, status, last_sync_at::text, last_error, created_at::text, updated_at::text
    FROM tenant_integrations
    WHERE tenant_id = $1 AND provider = 'accounting_api'
    LIMIT 1
    `,
    [tenantId]
  );
}

export async function listTenantIntegrations(tenantId: string) {
  return query<AccountingIntegrationStatus>(
    `
    SELECT id, tenant_id, provider, status, last_sync_at::text, last_error, created_at::text, updated_at::text
    FROM tenant_integrations
    WHERE tenant_id = $1
    ORDER BY provider ASC
    `,
    [tenantId]
  );
}

export async function upsertAccountingIntegration(args: {
  tenantId: string;
  apiKeyEnc: string;
  status: 'connected' | 'error';
  lastError: string | null;
}) {
  const { tenantId, apiKeyEnc, status, lastError } = args;
  return one<AccountingIntegrationStatus>(
    `
    INSERT INTO tenant_integrations (tenant_id, provider, api_key_enc, status, last_sync_at, last_error)
    VALUES ($1, 'accounting_api', $2, $3, CASE WHEN $3 = 'connected' THEN now() ELSE NULL END, $4)
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

export async function disconnectAccountingIntegration(tenantId: string) {
  return one<AccountingIntegrationStatus>(
    `
    UPDATE tenant_integrations
    SET status = 'disconnected', api_key_enc = NULL, last_error = NULL, updated_at = now()
    WHERE tenant_id = $1 AND provider = 'accounting_api'
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
    VALUES ($1, 'accounting_api', $2, $3, $4, $5::jsonb, 'pending')
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
    WHERE tenant_id = $1 AND provider = 'accounting_api' ${whereCursor}
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
    VALUES ($1, 'accounting_api', $2, $3, $4, $5::jsonb)
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
      AND provider = 'accounting_api'
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
    WHERE tenant_id = $1 AND provider = 'accounting_api'
    `,
    [tenantId]
  );
}

export async function setIntegrationError(tenantId: string, error: string) {
  await query(
    `
    UPDATE tenant_integrations
    SET status = 'error', last_error = $2, updated_at = now()
    WHERE tenant_id = $1 AND provider = 'accounting_api'
    `,
    [tenantId, error.slice(0, 1000)]
  );
}

export async function getIntegrationMapByLocal(
  tenantId: string,
  entityType: string,
  localId: string
) {
  return one<{
    id: string;
    remote_id: string;
    hash: string | null;
    last_pushed_at: string | null;
    last_pulled_at: string | null;
    last_remote_updated_at: string | null;
  }>(
    `
    SELECT id, remote_id, hash, last_pushed_at::text, last_pulled_at::text, last_remote_updated_at::text
    FROM integration_maps
    WHERE tenant_id = $1 AND provider = 'accounting_api' AND entity_type = $2 AND local_id = $3
    LIMIT 1
    `,
    [tenantId, entityType, localId]
  );
}

export async function getIntegrationMapByRemote(
  tenantId: string,
  entityType: string,
  remoteId: string
) {
  return one<{
    id: string;
    local_id: string;
    hash: string | null;
    last_pushed_at: string | null;
    last_pulled_at: string | null;
    last_remote_updated_at: string | null;
  }>(
    `
    SELECT id, local_id, hash, last_pushed_at::text, last_pulled_at::text, last_remote_updated_at::text
    FROM integration_maps
    WHERE tenant_id = $1 AND provider = 'accounting_api' AND entity_type = $2 AND remote_id = $3
    LIMIT 1
    `,
    [tenantId, entityType, remoteId]
  );
}

export async function upsertIntegrationMap(args: {
  tenantId: string;
  entityType: string;
  localId: string;
  remoteId: string;
  hash?: string | null;
  lastPushedAt?: Date | null;
  lastPulledAt?: Date | null;
  lastRemoteUpdatedAt?: Date | null;
}) {
  const {
    tenantId,
    entityType,
    localId,
    remoteId,
    hash = null,
    lastPushedAt = null,
    lastPulledAt = null,
    lastRemoteUpdatedAt = null,
  } = args;
  return one<{
    id: string;
    local_id: string;
    remote_id: string;
    hash: string | null;
    last_pushed_at: string | null;
    last_pulled_at: string | null;
    last_remote_updated_at: string | null;
  }>(
    `
    INSERT INTO integration_maps (
      tenant_id, provider, entity_type, local_id, remote_id, hash, last_pushed_at, last_pulled_at, last_remote_updated_at
    )
    VALUES ($1, 'accounting_api', $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (tenant_id, provider, entity_type, local_id)
    DO UPDATE SET
      remote_id = EXCLUDED.remote_id,
      hash = COALESCE(EXCLUDED.hash, integration_maps.hash),
      last_pushed_at = COALESCE(EXCLUDED.last_pushed_at, integration_maps.last_pushed_at),
      last_pulled_at = COALESCE(EXCLUDED.last_pulled_at, integration_maps.last_pulled_at),
      last_remote_updated_at = COALESCE(EXCLUDED.last_remote_updated_at, integration_maps.last_remote_updated_at),
      updated_at = now()
    RETURNING id, local_id, remote_id, hash, last_pushed_at::text, last_pulled_at::text, last_remote_updated_at::text
    `,
    [
      tenantId,
      entityType,
      localId,
      remoteId,
      hash,
      lastPushedAt ? lastPushedAt.toISOString() : null,
      lastPulledAt ? lastPulledAt.toISOString() : null,
      lastRemoteUpdatedAt ? lastRemoteUpdatedAt.toISOString() : null,
    ]
  );
}

export async function createSyncConflict(args: {
  tenantId: string;
  entityType: string;
  localId?: string | null;
  remoteId?: string | null;
  reason: string;
  localData: unknown;
  remoteData: unknown;
}) {
  return one<{ id: string }>(
    `
    INSERT INTO sync_conflicts (
      tenant_id, provider, entity_type, local_id, remote_id, reason, local_data, remote_data, status
    )
    VALUES ($1, 'accounting_api', $2, $3, $4, $5, $6::jsonb, $7::jsonb, 'open')
    RETURNING id
    `,
    [
      args.tenantId,
      args.entityType,
      args.localId ?? null,
      args.remoteId ?? null,
      args.reason,
      JSON.stringify(args.localData ?? null),
      JSON.stringify(args.remoteData ?? null),
    ]
  );
}

export async function listSyncConflicts(tenantId: string, entityType: string) {
  return query<{
    id: string;
    local_id: string | null;
    remote_id: string | null;
    reason: string;
    local_data: unknown;
    remote_data: unknown;
    status: string;
    resolution: string | null;
    resolved_by: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `
    SELECT
      id, local_id, remote_id, reason, local_data, remote_data, status, resolution, resolved_by,
      created_at::text, updated_at::text
    FROM sync_conflicts
    WHERE tenant_id = $1 AND provider = 'accounting_api' AND entity_type = $2
    ORDER BY created_at DESC
    `,
    [tenantId, entityType]
  );
}

export async function getSyncConflictById(tenantId: string, id: string) {
  return one<{
    id: string;
    entity_type: string;
    local_id: string | null;
    remote_id: string | null;
    local_data: unknown;
    remote_data: unknown;
    status: string;
  }>(
    `
    SELECT id, entity_type, local_id, remote_id, local_data, remote_data, status
    FROM sync_conflicts
    WHERE tenant_id = $1 AND provider = 'accounting_api' AND id = $2
    LIMIT 1
    `,
    [tenantId, id]
  );
}

export async function resolveSyncConflict(args: {
  tenantId: string;
  id: string;
  resolvedBy: string;
  resolution: 'use_local' | 'use_remote';
}) {
  return one<{ id: string; status: string; resolution: string | null; updated_at: string }>(
    `
    UPDATE sync_conflicts
    SET
      status = 'resolved',
      resolution = $3,
      resolved_by = $4,
      updated_at = now()
    WHERE tenant_id = $1 AND provider = 'accounting_api' AND id = $2 AND status = 'open'
    RETURNING id, status, resolution, updated_at::text
    `,
    [args.tenantId, args.id, args.resolution, args.resolvedBy]
  );
}
