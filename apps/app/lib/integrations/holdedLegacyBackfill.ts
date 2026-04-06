import { one } from '@/lib/db';

const LEGACY_PROVIDER = 'accounting_api';
const SHARED_PROVIDER = 'holded';

type HoldedConnectionChannel = 'dashboard' | 'chatgpt';

function normalizeChannel(channel?: HoldedConnectionChannel | null) {
  return channel === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

function normalizeLegacyStatus(status?: string | null) {
  if (status === 'connected' || status === 'error' || status === 'disconnected') {
    return status;
  }

  return 'pending';
}

async function detectTable(tableName: string) {
  const row = await one<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS exists",
    [tableName]
  );

  return row?.exists === true;
}

async function detectExternalConnectionsChannelColumn() {
  const row = await one<{ exists: boolean }>(
    [
      'SELECT EXISTS (',
      '  SELECT 1 FROM information_schema.columns',
      "  WHERE table_schema = 'public' AND table_name = 'external_connections' AND column_name = 'channel_key'",
      ') AS exists',
    ].join(' ')
  );

  return row?.exists === true;
}

async function detectExternalConnectionsLastErrorColumn() {
  const row = await one<{ exists: boolean }>(
    [
      'SELECT EXISTS (',
      '  SELECT 1 FROM information_schema.columns',
      "  WHERE table_schema = 'public' AND table_name = 'external_connections' AND column_name = 'last_error'",
      ') AS exists',
    ].join(' ')
  );

  return row?.exists === true;
}

export async function ensureSharedHoldedDashboardExternalConnectionFromLegacy(
  tenantId: string,
  channel?: HoldedConnectionChannel | null
) {
  const normalizedChannel = normalizeChannel(channel);
  if (normalizedChannel !== 'dashboard') {
    return false;
  }

  if (!(await detectTable('external_connections'))) {
    return false;
  }

  const channelColumnAvailable = await detectExternalConnectionsChannelColumn();
  const lastErrorColumnAvailable = await detectExternalConnectionsLastErrorColumn();
  const existingExternal = channelColumnAvailable
    ? await one<{ id: string }>(
        `
        SELECT id
        FROM external_connections
        WHERE tenant_id = $1 AND provider = $2 AND channel_key = $3
        LIMIT 1
        `,
        [tenantId, SHARED_PROVIDER, normalizedChannel]
      )
    : await one<{ id: string }>(
        `
        SELECT id
        FROM external_connections
        WHERE tenant_id = $1 AND provider = $2
        LIMIT 1
        `,
        [tenantId, SHARED_PROVIDER]
      );

  if (existingExternal?.id || !(await detectTable('tenant_integrations'))) {
    return false;
  }

  const legacy = await one<{
    api_key_enc: string | null;
    status: string;
    last_sync_at: string | null;
    last_error: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `
    SELECT api_key_enc, status, last_sync_at::text, last_error, created_at::text, updated_at::text
    FROM tenant_integrations
    WHERE tenant_id = $1 AND provider = $2 AND api_key_enc IS NOT NULL
    ORDER BY updated_at DESC
    LIMIT 1
    `,
    [tenantId, LEGACY_PROVIDER]
  );

  if (!legacy?.api_key_enc) {
    return false;
  }

  const normalizedStatus = normalizeLegacyStatus(legacy.status);
  const lastValidatedAt = legacy.updated_at ?? legacy.last_sync_at ?? legacy.created_at;

  if (channelColumnAvailable) {
    if (lastErrorColumnAvailable) {
      await one<{ id: string }>(
        `
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
        VALUES (
          $1,
          $2,
          $3,
          'api_key',
          $4,
          ARRAY[]::text[],
          $5,
          $6,
          CASE WHEN $5 <> 'disconnected' THEN $7::timestamptz ELSE NULL END,
          CASE WHEN $5 <> 'disconnected' THEN $8::timestamptz ELSE NULL END,
          $9::timestamptz,
          $7::timestamptz,
          $8::timestamptz
        )
        ON CONFLICT (tenant_id, provider, channel_key) DO NOTHING
        RETURNING id
        `,
        [
          tenantId,
          SHARED_PROVIDER,
          normalizedChannel,
          legacy.api_key_enc,
          normalizedStatus,
          legacy.last_error ?? null,
          legacy.created_at,
          lastValidatedAt,
          legacy.last_sync_at,
        ]
      );
      return true;
    }

    await one<{ id: string }>(
      `
      INSERT INTO external_connections (
        tenant_id,
        provider,
        channel_key,
        credential_type,
        api_key_enc,
        scopes_granted,
        connection_status,
        connected_at,
        last_validated_at,
        last_sync_at,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        'api_key',
        $4,
        ARRAY[]::text[],
        $5,
        CASE WHEN $5 <> 'disconnected' THEN $6::timestamptz ELSE NULL END,
        CASE WHEN $5 <> 'disconnected' THEN $7::timestamptz ELSE NULL END,
        $8::timestamptz,
        $6::timestamptz,
        $7::timestamptz
      )
      ON CONFLICT (tenant_id, provider, channel_key) DO NOTHING
      RETURNING id
      `,
      [
        tenantId,
        SHARED_PROVIDER,
        normalizedChannel,
        legacy.api_key_enc,
        normalizedStatus,
        legacy.created_at,
        lastValidatedAt,
        legacy.last_sync_at,
      ]
    );
    return true;
  }

  if (lastErrorColumnAvailable) {
    await one<{ id: string }>(
      `
      INSERT INTO external_connections (
        tenant_id,
        provider,
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
      VALUES (
        $1,
        $2,
        'api_key',
        $3,
        ARRAY[]::text[],
        $4,
        $5,
        CASE WHEN $4 <> 'disconnected' THEN $6::timestamptz ELSE NULL END,
        CASE WHEN $4 <> 'disconnected' THEN $7::timestamptz ELSE NULL END,
        $8::timestamptz,
        $6::timestamptz,
        $7::timestamptz
      )
      ON CONFLICT (tenant_id, provider) DO NOTHING
      RETURNING id
      `,
      [
        tenantId,
        SHARED_PROVIDER,
        legacy.api_key_enc,
        normalizedStatus,
        legacy.last_error ?? null,
        legacy.created_at,
        lastValidatedAt,
        legacy.last_sync_at,
      ]
    );
    return true;
  }

  await one<{ id: string }>(
    `
    INSERT INTO external_connections (
      tenant_id,
      provider,
      credential_type,
      api_key_enc,
      scopes_granted,
      connection_status,
      connected_at,
      last_validated_at,
      last_sync_at,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      'api_key',
      $3,
      ARRAY[]::text[],
      $4,
      CASE WHEN $4 <> 'disconnected' THEN $5::timestamptz ELSE NULL END,
      CASE WHEN $4 <> 'disconnected' THEN $6::timestamptz ELSE NULL END,
      $7::timestamptz,
      $5::timestamptz,
      $6::timestamptz
    )
    ON CONFLICT (tenant_id, provider) DO NOTHING
    RETURNING id
    `,
    [
      tenantId,
      SHARED_PROVIDER,
      legacy.api_key_enc,
      normalizedStatus,
      legacy.created_at,
      lastValidatedAt,
      legacy.last_sync_at,
    ]
  );
  return true;
}
