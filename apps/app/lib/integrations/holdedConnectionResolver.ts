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
};

type TenantIntegrationRow = {
  id: string;
  tenant_id: string;
  provider: string;
  api_key_enc: string | null;
  status: string;
  last_sync_at: string | null;
};

let externalConnectionsTableAvailable: boolean | null = null;
let externalConnectionsChannelColumnAvailable: boolean | null = null;

export type HoldedConnectionChannel = 'dashboard' | 'chatgpt';

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

export async function hasSharedHoldedConnectionForTenant(
  tenantId: string,
  channel?: HoldedConnectionChannel
) {
  const normalizedChannel = normalizeHoldedChannel(channel);
  if (await hasExternalConnectionsTable()) {
    const external = (await hasExternalConnectionsChannelColumn())
      ? await one<{ exists: boolean }>(
          [
            'SELECT EXISTS (',
            '  SELECT 1 FROM external_connections',
            "  WHERE tenant_id = $1 AND provider = 'holded' AND channel_key = $2 AND api_key_enc IS NOT NULL",
            ') AS exists',
          ].join(' '),
          [tenantId, normalizedChannel]
        )
      : await one<{ exists: boolean }>(
          [
            'SELECT EXISTS (',
            '  SELECT 1 FROM external_connections',
            "  WHERE tenant_id = $1 AND provider = 'holded' AND api_key_enc IS NOT NULL",
            ') AS exists',
          ].join(' '),
          [tenantId]
        );

    if (external?.exists) {
      return true;
    }
  }

  if (normalizedChannel !== 'dashboard') {
    return false;
  }

  const legacy = await one<{ exists: boolean }>(
    [
      'SELECT EXISTS (',
      '  SELECT 1 FROM tenant_integrations',
      "  WHERE tenant_id = $1 AND provider = 'accounting_api' AND api_key_enc IS NOT NULL",
      ') AS exists',
    ].join(' '),
    [tenantId]
  );

  return legacy?.exists === true;
}

export async function resolveSharedHoldedConnectionForTenant(
  tenantId: string,
  channel?: HoldedConnectionChannel
) {
  const normalizedChannel = normalizeHoldedChannel(channel);
  if (await hasExternalConnectionsTable()) {
    const external = (await hasExternalConnectionsChannelColumn())
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
            '  last_sync_at::text',
            'FROM external_connections',
            "WHERE tenant_id = $1 AND provider = 'holded' AND channel_key = $2 AND api_key_enc IS NOT NULL",
            'ORDER BY updated_at DESC',
            'LIMIT 1',
          ].join(' '),
          [tenantId, normalizedChannel]
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
            '  last_sync_at::text',
            'FROM external_connections',
            "WHERE tenant_id = $1 AND provider = 'holded' AND api_key_enc IS NOT NULL",
            'ORDER BY updated_at DESC',
            'LIMIT 1',
          ].join(' '),
          [tenantId]
        );

    if (external?.api_key_enc) {
      return {
        id: external.id,
        tenantId: external.tenant_id,
        provider: 'holded' as const,
        providerAccountId: external.provider_account_id,
        credentialType: external.credential_type,
        apiKey: decryptIntegrationSecret(external.api_key_enc),
        status: external.connection_status,
        channel: external.channel_key ?? 'legacy',
        lastSyncAt: external.last_sync_at,
        source: 'external_connection' as const,
      };
    }
  }

  if (normalizedChannel !== 'dashboard') {
    return null;
  }

  const legacy = await one<TenantIntegrationRow>(
    "SELECT id, tenant_id, provider, api_key_enc, status, last_sync_at::text FROM tenant_integrations WHERE tenant_id = $1 AND provider = 'accounting_api' LIMIT 1",
    [tenantId]
  );

  if (!legacy?.api_key_enc) return null;

  return {
    id: legacy.id,
    tenantId: legacy.tenant_id,
    provider: 'holded' as const,
    providerAccountId: null,
    credentialType: 'api_key' as const,
    apiKey: decryptIntegrationSecret(legacy.api_key_enc),
    status: legacy.status,
    channel: 'legacy' as const,
    lastSyncAt: legacy.last_sync_at,
    source: 'tenant_integration' as const,
  };
}
