import { one } from '@/lib/db';
import { decryptIntegrationSecret } from '@/lib/integrations/secretCrypto';

type ExternalConnectionRow = {
  id: string;
  tenant_id: string;
  provider: string;
  channel_key: string | null;
  origin_channel: string | null;
  provider_account_id: string | null;
  credential_type: string;
  api_key_enc: string | null;
  connection_status: string;
  ownership_status: string | null;
  managed_by_third_party: boolean | null;
  client_admin_gap: boolean | null;
  high_governance_risk: boolean | null;
  under_claim_review: boolean | null;
  connected_by_user_id: string | null;
  technical_operator_user_id: string | null;
  connected_at: string | null;
  last_validated_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
};

let externalConnectionsTableAvailable: boolean | null = null;
let externalConnectionsChannelColumnAvailable: boolean | null = null;
const externalConnectionsColumnAvailability = new Map<string, boolean>();

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
  originChannel: string | null;
  ownershipStatus: string | null;
  managedByThirdParty: boolean;
  clientAdminGap: boolean;
  highGovernanceRisk: boolean;
  underClaimReview: boolean;
  technicalOperatorUserId: string | null;
  connectedAt: string | null;
  lastValidatedAt: string | null;
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

async function hasExternalConnectionsColumn(columnName: string) {
  if (externalConnectionsColumnAvailability.has(columnName)) {
    return externalConnectionsColumnAvailability.get(columnName) === true;
  }

  const row = await one<{ exists: boolean }>(
    [
      'SELECT EXISTS (',
      '  SELECT 1 FROM information_schema.columns',
      "  WHERE table_schema = 'public' AND table_name = 'external_connections' AND column_name = $1",
      ') AS exists',
    ].join(' '),
    [columnName]
  );

  const exists = row?.exists === true;
  externalConnectionsColumnAvailability.set(columnName, exists);
  return exists;
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
  const optionalColumns = [
    'origin_channel',
    'last_error',
    'ownership_status',
    'managed_by_third_party',
    'client_admin_gap',
    'high_governance_risk',
    'under_claim_review',
    'technical_operator_user_id',
  ] as const;

  const available = new Map<string, boolean>();
  for (const columnName of optionalColumns) {
    available.set(columnName, await hasExternalConnectionsColumn(columnName));
  }

  const selectOrNull = (columnName: string, fallbackSql: string) =>
    available.get(columnName) ? `  ${columnName},` : `  ${fallbackSql},`;

  return (await hasExternalConnectionsChannelColumn())
    ? await one<ExternalConnectionRow>(
        [
          'SELECT',
          '  id,',
          '  tenant_id,',
          '  provider,',
          '  channel_key,',
          selectOrNull('origin_channel', 'NULL::text AS origin_channel'),
          '  provider_account_id,',
          '  credential_type,',
          '  api_key_enc,',
          '  connection_status,',
          selectOrNull('ownership_status', 'NULL::text AS ownership_status'),
          selectOrNull('managed_by_third_party', 'false::boolean AS managed_by_third_party'),
          selectOrNull('client_admin_gap', 'false::boolean AS client_admin_gap'),
          selectOrNull('high_governance_risk', 'false::boolean AS high_governance_risk'),
          selectOrNull('under_claim_review', 'false::boolean AS under_claim_review'),
          '  connected_by_user_id,',
          selectOrNull('technical_operator_user_id', 'NULL::text AS technical_operator_user_id'),
          '  connected_at::text,',
          '  last_validated_at::text,',
          '  last_sync_at::text,',
          available.get('last_error') ? '  last_error' : '  NULL::text AS last_error',
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
          selectOrNull('origin_channel', 'NULL::text AS origin_channel'),
          '  provider_account_id,',
          '  credential_type,',
          '  api_key_enc,',
          '  connection_status,',
          selectOrNull('ownership_status', 'NULL::text AS ownership_status'),
          selectOrNull('managed_by_third_party', 'false::boolean AS managed_by_third_party'),
          selectOrNull('client_admin_gap', 'false::boolean AS client_admin_gap'),
          selectOrNull('high_governance_risk', 'false::boolean AS high_governance_risk'),
          selectOrNull('under_claim_review', 'false::boolean AS under_claim_review'),
          '  connected_by_user_id,',
          selectOrNull('technical_operator_user_id', 'NULL::text AS technical_operator_user_id'),
          '  connected_at::text,',
          '  last_validated_at::text,',
          '  last_sync_at::text,',
          available.get('last_error') ? '  last_error' : '  NULL::text AS last_error',
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
    originChannel: external.origin_channel ?? external.channel_key ?? requestedChannel,
    ownershipStatus: external.ownership_status ?? null,
    managedByThirdParty: external.managed_by_third_party === true,
    clientAdminGap: external.client_admin_gap === true,
    highGovernanceRisk: external.high_governance_risk === true,
    underClaimReview: external.under_claim_review === true,
    technicalOperatorUserId: external.technical_operator_user_id ?? null,
    connectedAt: external.connected_at,
    lastValidatedAt: external.last_validated_at,
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
