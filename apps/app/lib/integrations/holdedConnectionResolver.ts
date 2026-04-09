import { one } from '@/lib/db';
import { decryptIntegrationSecret } from '@/lib/integrations/secretCrypto';

type ExternalConnectionRow = {
  id: string;
  tenant_id: string;
  provider: string;
  channel_key: string | null;
  provider_account_id: string | null;
  credential_type: string;
  api_key_enc: string | null;
  connection_status: string;
  connected_by_user_id: string | null;
  connected_at: string | null;
  last_validated_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
};

let externalConnectionsTableAvailable: boolean | null = null;
let externalConnectionsChannelColumnAvailable: boolean | null = null;
let externalConnectionsLastErrorColumnAvailable: boolean | null = null;

export type HoldedConnectionChannel = 'dashboard' | 'chatgpt';
export type HoldedConnectionSource = 'external_connection';

export type HoldedConnectionStatusSnapshot = {
  id: string;
  tenantId: string;
  provider: 'holded';
  providerAccountId: string | null;
  credentialType: string;
  status: string;
  channel: HoldedConnectionChannel;
  lastSyncAt: string | null;
  lastError: string | null;
  source: HoldedConnectionSource;
};

export type HoldedResolvedConnection = HoldedConnectionStatusSnapshot & {
  apiKey: string;
};

function normalizeHoldedChannel(channel?: string | null): HoldedConnectionChannel {
  return channel === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

async function hasExternalConnectionsTable() {
  if (externalConnectionsTableAvailable !== null) return externalConnectionsTableAvailable;

  const row = await one<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'external_connections') AS exists"
  );

  externalConnectionsTableAvailable = row?.exists === true;
  return externalConnectionsTableAvailable;
}

async function hasExternalConnectionsChannelColumn() {
  if (externalConnectionsChannelColumnAvailable !== null) {
    return externalConnectionsChannelColumnAvailable;
  }

  const row = await one<{ exists: boolean }>(
    [
      'SELECT EXISTS (',
      '  SELECT 1 FROM information_schema.columns',
      "  WHERE table_schema = 'public' AND table_name = 'external_connections' AND column_name = 'channel_key'",
      ') AS exists',
    ].join(' ')
  );

  externalConnectionsChannelColumnAvailable = row?.exists === true;
  return externalConnectionsChannelColumnAvailable;
}

async function hasExternalConnectionsLastErrorColumn() {
  if (externalConnectionsLastErrorColumnAvailable !== null) {
    return externalConnectionsLastErrorColumnAvailable;
  }

  const row = await one<{ exists: boolean }>(
    [
      'SELECT EXISTS (',
      '  SELECT 1 FROM information_schema.columns',
      "  WHERE table_schema = 'public' AND table_name = 'external_connections' AND column_name = 'last_error'",
      ') AS exists',
    ].join(' ')
  );

  externalConnectionsLastErrorColumnAvailable = row?.exists === true;
  return externalConnectionsLastErrorColumnAvailable;
}

async function loadExternalConnectionRow(
  tenantId: string,
  channel: HoldedConnectionChannel,
  options?: { requireApiKey?: boolean }
) {
  if (!(await hasExternalConnectionsTable())) {
    return null;
  }

  const apiKeyFilter = options?.requireApiKey === false ? '' : ' AND api_key_enc IS NOT NULL';
  const hasLastErrorColumn = await hasExternalConnectionsLastErrorColumn();
  const lastErrorSelect = hasLastErrorColumn ? '  last_error,' : '  NULL::text AS last_error,';

  return (await hasExternalConnectionsChannelColumn())
    ? await one<ExternalConnectionRow>(
        [
          'SELECT',
          '  id,',
          '  tenant_id,',
          '  provider,',
          '  channel_key,',
          '  provider_account_id,',
          '  credential_type,',
          '  api_key_enc,',
          '  connection_status,',
          '  connected_by_user_id,',
          '  connected_at::text,',
          '  last_validated_at::text,',
          '  last_sync_at::text,',
          lastErrorSelect,
          'FROM external_connections',
          `WHERE tenant_id = $1 AND provider = 'holded' AND channel_key = $2${apiKeyFilter}`,
          'ORDER BY updated_at DESC',
          'LIMIT 1',
        ].join(' '),
        [tenantId, channel]
      )
    : await one<ExternalConnectionRow>(
        [
          'SELECT',
          '  id,',
          '  tenant_id,',
          '  provider,',
          '  NULL::text AS channel_key,',
          '  provider_account_id,',
          '  credential_type,',
          '  api_key_enc,',
          '  connection_status,',
          '  connected_by_user_id,',
          '  connected_at::text,',
          '  last_validated_at::text,',
          '  last_sync_at::text,',
          lastErrorSelect,
          'FROM external_connections',
          `WHERE tenant_id = $1 AND provider = 'holded'${apiKeyFilter}`,
          'ORDER BY updated_at DESC',
          'LIMIT 1',
        ].join(' '),
        [tenantId]
      );
}

function mapExternalConnectionStatus(
  external: ExternalConnectionRow,
  requestedChannel: HoldedConnectionChannel
): HoldedConnectionStatusSnapshot {
  return {
    id: external.id,
    tenantId: external.tenant_id,
    provider: 'holded',
    providerAccountId: external.provider_account_id,
    credentialType: external.credential_type,
    status: external.connection_status,
    channel: external.channel_key === 'chatgpt' ? 'chatgpt' : requestedChannel,
    lastSyncAt: external.last_sync_at,
    lastError: external.last_error ?? null,
    source: 'external_connection',
  };
}

export async function hasSharedHoldedConnectionForTenant(
  tenantId: string,
  channel?: HoldedConnectionChannel
) {
  const normalizedChannel = normalizeHoldedChannel(channel);
  const external = await loadExternalConnectionRow(tenantId, normalizedChannel, {
    requireApiKey: false,
  });

  return Boolean(external?.api_key_enc);
}

export async function resolveSharedHoldedConnectionStatusForTenant(
  tenantId: string,
  channel?: HoldedConnectionChannel
) {
  const normalizedChannel = normalizeHoldedChannel(channel);
  const external = await loadExternalConnectionRow(tenantId, normalizedChannel, {
    requireApiKey: false,
  });

  if (external) {
    return mapExternalConnectionStatus(external, normalizedChannel);
  }

  return null;
}

export async function resolveSharedHoldedConnectionForTenant(
  tenantId: string,
  channel?: HoldedConnectionChannel
) {
  const normalizedChannel = normalizeHoldedChannel(channel);
  const external = await loadExternalConnectionRow(tenantId, normalizedChannel, {
    requireApiKey: false,
  });

  if (external?.api_key_enc) {
    return {
      ...mapExternalConnectionStatus(external, normalizedChannel),
      apiKey: decryptIntegrationSecret(external.api_key_enc),
    } satisfies HoldedResolvedConnection;
  }

  return null;
}
