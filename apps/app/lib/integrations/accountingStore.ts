import { one, query } from '@/lib/db';
import { resolveSharedHoldedConnectionStatusForTenant } from '@/lib/integrations/holdedConnectionResolver';

const PROVIDER = 'accounting_api';
const SHARED_PROVIDER = 'holded';

export type AccountingIntegrationChannel = 'dashboard' | 'chatgpt';

function describeStorageError(error: unknown) {
  if (error instanceof Error) {
    const candidate = error as Error & {
      code?: string;
      detail?: string;
      constraint?: string;
      table?: string;
    };
    return (
      [candidate.message, candidate.code, candidate.detail, candidate.constraint, candidate.table]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' | ') ||
      candidate.name ||
      'Unknown storage error'
    );
  }

  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unserializable storage error object';
    }
  }

  return String(error || 'Unknown storage error');
}

let externalConnectionsTableAvailable: boolean | null = null;
let externalConnectionsChannelColumnAvailable: boolean | null = null;
let externalConnectionsOptionalColumnsEnsured = false;
let storageBootstrapAttempted = false;

function normalizeAccountingChannel(channel?: string | null): AccountingIntegrationChannel {
  return channel === 'chatgpt' ? 'chatgpt' : 'dashboard';
}

async function detectTable(tableName: string) {
  const row = await one<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS exists",
    [tableName]
  );

  return row?.exists === true;
}

async function bootstrapIntegrationStorageTables() {
  if (storageBootstrapAttempted) return;
  storageBootstrapAttempted = true;

  try {
    await query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await query(
      [
        'DO $$',
        'BEGIN',
        "  CREATE TYPE ownership_status AS ENUM ('confirmed', 'pending_confirmation', 'third_party_managed');",
        'EXCEPTION',
        '  WHEN duplicate_object THEN NULL;',
        'END',
        '$$;',
      ].join(' ')
    );

    await query(
      `
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
      )
      `
    );
    await query(
      'CREATE UNIQUE INDEX IF NOT EXISTS tenant_integrations_tenant_provider_key ON tenant_integrations(tenant_id, provider)'
    );
    await query(
      'CREATE INDEX IF NOT EXISTS tenant_integrations_tenant_provider_idx ON tenant_integrations(tenant_id, provider)'
    );

    await query(
      `
      CREATE TABLE IF NOT EXISTS external_connections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        provider text NOT NULL,
        channel_key text NOT NULL DEFAULT 'dashboard',
        origin_channel text,
        provider_account_id text,
        credential_type text NOT NULL DEFAULT 'api_key',
        api_key_enc text,
        scopes_granted text[] NOT NULL DEFAULT ARRAY[]::text[],
        connection_status text NOT NULL DEFAULT 'disconnected',
        ownership_status ownership_status,
        managed_by_third_party boolean NOT NULL DEFAULT false,
        client_admin_gap boolean NOT NULL DEFAULT true,
        high_governance_risk boolean NOT NULL DEFAULT false,
        under_claim_review boolean NOT NULL DEFAULT false,
        connected_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
        technical_operator_user_id text REFERENCES users(id) ON DELETE SET NULL,
        connected_at timestamptz,
        last_validated_at timestamptz,
        last_sync_at timestamptz,
        disconnected_at timestamptz,
        revoked_at timestamptz,
        last_error text,
        company_identity_json jsonb,
        governance_updated_at timestamptz,
        legal_terms_accepted_at timestamptz,
        legal_privacy_accepted_at timestamptz,
        legal_acceptance_version text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, provider, channel_key)
      )
      `
    );
    await query(
      'CREATE INDEX IF NOT EXISTS external_connections_tenant_provider_channel_key_connection_status_idx ON external_connections (tenant_id, provider, channel_key, connection_status)'
    );
    await query(
      'CREATE INDEX IF NOT EXISTS external_connections_connected_by_user_idx ON external_connections (connected_by_user_id)'
    );
    await query(
      'CREATE INDEX IF NOT EXISTS external_connections_technical_operator_user_idx ON external_connections (technical_operator_user_id)'
    );
  } catch (error) {
    console.error('[accountingStore] failed to bootstrap integration storage tables', {
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    externalConnectionsTableAvailable = await detectTable('external_connections');
    externalConnectionsChannelColumnAvailable = externalConnectionsTableAvailable
      ? await detectExternalConnectionsChannelColumn()
      : false;
    if (externalConnectionsTableAvailable) {
      await ensureExternalConnectionsOptionalSchema();
    }
  }
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

async function ensureExternalConnectionsChannelSchema() {
  if (!(await detectTable('external_connections'))) {
    externalConnectionsChannelColumnAvailable = false;
    return;
  }

  try {
    await query(
      "ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS channel_key text NOT NULL DEFAULT 'dashboard'"
    );
    await query(
      "UPDATE external_connections SET channel_key = 'dashboard' WHERE channel_key IS NULL"
    );
    await query(
      [
        'DO $$',
        'DECLARE existing_constraint text;',
        'BEGIN',
        '  SELECT conname',
        '  INTO existing_constraint',
        '  FROM pg_constraint',
        "  WHERE conrelid = 'external_connections'::regclass",
        "    AND contype = 'u'",
        '    AND conkey = ARRAY[',
        "      (SELECT attnum FROM pg_attribute WHERE attrelid = 'external_connections'::regclass AND attname = 'tenant_id'),",
        "      (SELECT attnum FROM pg_attribute WHERE attrelid = 'external_connections'::regclass AND attname = 'provider')",
        '    ];',
        '',
        '  IF existing_constraint IS NOT NULL THEN',
        "    EXECUTE format('ALTER TABLE external_connections DROP CONSTRAINT %I', existing_constraint);",
        '  END IF;',
        'END $$;',
      ].join(' ')
    );
    await query('DROP INDEX IF EXISTS external_connections_tenant_provider_status_idx');
    await query(
      'CREATE UNIQUE INDEX IF NOT EXISTS external_connections_tenant_provider_channel_key_key ON external_connections (tenant_id, provider, channel_key)'
    );
    await query(
      'CREATE INDEX IF NOT EXISTS external_connections_tenant_provider_channel_key_connection_status_idx ON external_connections (tenant_id, provider, channel_key, connection_status)'
    );
  } catch (error) {
    console.error('[accountingStore] failed to ensure external_connections channel schema', {
      message: describeStorageError(error),
    });
  } finally {
    externalConnectionsChannelColumnAvailable = await detectExternalConnectionsChannelColumn();
  }
}

async function ensureExternalConnectionsOptionalSchema() {
  if (externalConnectionsOptionalColumnsEnsured) return;

  if (!(await detectTable('external_connections'))) {
    return;
  }

  try {
    await query(
      [
        'DO $$',
        'BEGIN',
        "  CREATE TYPE ownership_status AS ENUM ('confirmed', 'pending_confirmation', 'third_party_managed');",
        'EXCEPTION',
        '  WHEN duplicate_object THEN NULL;',
        'END',
        '$$;',
      ].join(' ')
    );
    await query('ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS origin_channel text');
    await query(
      'ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS ownership_status ownership_status'
    );
    await query(
      'ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS managed_by_third_party boolean NOT NULL DEFAULT false'
    );
    await query(
      'ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS client_admin_gap boolean NOT NULL DEFAULT true'
    );
    await query(
      'ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS high_governance_risk boolean NOT NULL DEFAULT false'
    );
    await query(
      'ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS under_claim_review boolean NOT NULL DEFAULT false'
    );
    await query(
      'ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS technical_operator_user_id text REFERENCES users(id) ON DELETE SET NULL'
    );
    await query(
      'ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS disconnected_at timestamptz'
    );
    await query('ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS revoked_at timestamptz');
    await query(
      'ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS company_identity_json jsonb'
    );
    await query(
      'ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS governance_updated_at timestamptz'
    );
    await query('ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS last_error text');
    await query(
      'ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS legal_terms_accepted_at timestamptz'
    );
    await query(
      'ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS legal_privacy_accepted_at timestamptz'
    );
    await query(
      'ALTER TABLE external_connections ADD COLUMN IF NOT EXISTS legal_acceptance_version text'
    );
    await query(
      'CREATE INDEX IF NOT EXISTS external_connections_technical_operator_user_idx ON external_connections (technical_operator_user_id)'
    );
    externalConnectionsOptionalColumnsEnsured = true;
  } catch (error) {
    console.error('[accountingStore] failed to ensure external_connections optional schema', {
      message: describeStorageError(error),
    });
  }
}

async function hasExternalConnectionsTable() {
  if (externalConnectionsTableAvailable !== null) return externalConnectionsTableAvailable;

  externalConnectionsTableAvailable = await detectTable('external_connections');
  if (!externalConnectionsTableAvailable) {
    await bootstrapIntegrationStorageTables();
  }
  if (externalConnectionsTableAvailable) {
    await ensureExternalConnectionsOptionalSchema();
  }
  return externalConnectionsTableAvailable === true;
}

async function hasExternalConnectionsChannelColumn() {
  if (externalConnectionsChannelColumnAvailable !== null) {
    return externalConnectionsChannelColumnAvailable;
  }

  if (!(await hasExternalConnectionsTable())) {
    externalConnectionsChannelColumnAvailable = false;
    return false;
  }

  externalConnectionsChannelColumnAvailable = await detectExternalConnectionsChannelColumn();
  if (!externalConnectionsChannelColumnAvailable) {
    await ensureExternalConnectionsChannelSchema();
  }

  return externalConnectionsChannelColumnAvailable === true;
}

export type AccountingIntegrationStatus = {
  id: string;
  tenant_id: string;
  provider: string;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function mapResolvedHoldedStatusToAccountingIntegration(
  connection: NonNullable<Awaited<ReturnType<typeof resolveSharedHoldedConnectionStatusForTenant>>>
): AccountingIntegrationStatus {
  return {
    id: connection.id,
    tenant_id: connection.tenantId,
    provider: PROVIDER,
    status: connection.status,
    last_sync_at: connection.lastSyncAt,
    last_error: connection.lastError,
    created_at: null,
    updated_at: null,
  };
}

export async function getAccountingIntegration(tenantId: string) {
  const holded = await resolveSharedHoldedConnectionStatusForTenant(tenantId, 'dashboard');
  return holded ? mapResolvedHoldedStatusToAccountingIntegration(holded) : null;
}

export async function listTenantIntegrations(tenantId: string) {
  const legacyRows = await query<AccountingIntegrationStatus>(
    `
    SELECT id, tenant_id, provider, status, last_sync_at::text, last_error, created_at::text, updated_at::text
    FROM tenant_integrations
    WHERE tenant_id = $1 AND provider <> $2
    ORDER BY provider ASC
    `,
    [tenantId, PROVIDER]
  );
  const holded = await getAccountingIntegration(tenantId);

  return holded
    ? [...legacyRows, holded].sort((left, right) => left.provider.localeCompare(right.provider))
    : legacyRows;
}

export async function upsertAccountingIntegration(args: {
  tenantId: string;
  apiKeyEnc: string;
  status: 'connected' | 'error';
  lastError: string | null;
  connectedByUserId?: string | null;
  channelKey?: AccountingIntegrationChannel | null;
  legalTermsAcceptedAt?: Date | null;
  legalPrivacyAcceptedAt?: Date | null;
  legalAcceptanceVersion?: string | null;
}) {
  const {
    tenantId,
    apiKeyEnc,
    status,
    lastError,
    connectedByUserId,
    channelKey,
    legalTermsAcceptedAt,
    legalPrivacyAcceptedAt,
    legalAcceptanceVersion,
  } = args;
  const normalizedChannel = normalizeAccountingChannel(channelKey);
  let saved: AccountingIntegrationStatus | null = null;

  try {
    if (await hasExternalConnectionsTable()) {
      const external = (await hasExternalConnectionsChannelColumn())
        ? await one<{
            id: string;
            tenant_id: string;
            provider: string;
            status: string;
            last_sync_at: string | null;
            created_at: string;
            updated_at: string;
          }>(
            `
            INSERT INTO external_connections (
              tenant_id,
              provider,
              channel_key,
              origin_channel,
              credential_type,
              api_key_enc,
              scopes_granted,
              connection_status,
              ownership_status,
              managed_by_third_party,
              client_admin_gap,
              high_governance_risk,
              under_claim_review,
              last_error,
              connected_by_user_id,
              technical_operator_user_id,
              connected_at,
              last_validated_at,
              last_sync_at,
              disconnected_at,
              revoked_at,
              company_identity_json,
              governance_updated_at,
              legal_terms_accepted_at,
              legal_privacy_accepted_at,
              legal_acceptance_version
            )
            VALUES (
              $1,
              $2,
              $3,
              $3,
              'api_key',
              $4,
              ARRAY[]::text[],
              $5,
              'pending_confirmation',
              false,
              true,
              false,
              false,
              $6,
              $7,
              $7,
              CASE WHEN $5 = 'connected' THEN now() ELSE NULL END,
              CASE WHEN $5 = 'connected' THEN now() ELSE NULL END,
              CASE WHEN $5 = 'connected' THEN now() ELSE NULL END,
              NULL,
              NULL,
              NULL::jsonb,
              now(),
              $8,
              $9,
              $10
            )
            ON CONFLICT (tenant_id, provider, channel_key)
            DO UPDATE SET
              origin_channel = COALESCE(EXCLUDED.origin_channel, external_connections.origin_channel),
              api_key_enc = EXCLUDED.api_key_enc,
              connection_status = EXCLUDED.connection_status,
              ownership_status = COALESCE(external_connections.ownership_status, EXCLUDED.ownership_status),
              managed_by_third_party = COALESCE(external_connections.managed_by_third_party, EXCLUDED.managed_by_third_party),
              client_admin_gap = COALESCE(external_connections.client_admin_gap, EXCLUDED.client_admin_gap),
              high_governance_risk = COALESCE(external_connections.high_governance_risk, EXCLUDED.high_governance_risk),
              under_claim_review = COALESCE(external_connections.under_claim_review, EXCLUDED.under_claim_review),
              last_error = EXCLUDED.last_error,
              connected_by_user_id = EXCLUDED.connected_by_user_id,
              technical_operator_user_id = COALESCE(EXCLUDED.technical_operator_user_id, external_connections.technical_operator_user_id),
              connected_at = COALESCE(EXCLUDED.connected_at, external_connections.connected_at),
              last_validated_at = EXCLUDED.last_validated_at,
              last_sync_at = COALESCE(EXCLUDED.last_sync_at, external_connections.last_sync_at),
              disconnected_at = NULL,
              revoked_at = NULL,
              governance_updated_at = now(),
              legal_terms_accepted_at = COALESCE(EXCLUDED.legal_terms_accepted_at, external_connections.legal_terms_accepted_at),
              legal_privacy_accepted_at = COALESCE(EXCLUDED.legal_privacy_accepted_at, external_connections.legal_privacy_accepted_at),
              legal_acceptance_version = COALESCE(EXCLUDED.legal_acceptance_version, external_connections.legal_acceptance_version),
              updated_at = now()
            RETURNING id, tenant_id, provider, connection_status AS status, last_sync_at::text, created_at::text, updated_at::text
            `,
            [
              tenantId,
              SHARED_PROVIDER,
              normalizedChannel,
              apiKeyEnc,
              status,
              lastError,
              connectedByUserId ?? null,
              legalTermsAcceptedAt ?? null,
              legalPrivacyAcceptedAt ?? null,
              legalAcceptanceVersion ?? null,
            ]
          )
        : await one<{
            id: string;
            tenant_id: string;
            provider: string;
            status: string;
            last_sync_at: string | null;
            created_at: string;
            updated_at: string;
          }>(
            `
            INSERT INTO external_connections (
              tenant_id,
              provider,
              origin_channel,
              credential_type,
              api_key_enc,
              scopes_granted,
              connection_status,
              ownership_status,
              managed_by_third_party,
              client_admin_gap,
              high_governance_risk,
              under_claim_review,
              last_error,
              connected_by_user_id,
              technical_operator_user_id,
              connected_at,
              last_validated_at,
              last_sync_at,
              disconnected_at,
              revoked_at,
              company_identity_json,
              governance_updated_at,
              legal_terms_accepted_at,
              legal_privacy_accepted_at,
              legal_acceptance_version
            )
            VALUES (
              $1,
              $2,
              $10,
              'api_key',
              $3,
              ARRAY[]::text[],
              $4,
              'pending_confirmation',
              false,
              true,
              false,
              false,
              $5,
              $6,
              $6,
              CASE WHEN $4 = 'connected' THEN now() ELSE NULL END,
              CASE WHEN $4 = 'connected' THEN now() ELSE NULL END,
              CASE WHEN $4 = 'connected' THEN now() ELSE NULL END,
              NULL,
              NULL,
              NULL::jsonb,
              now(),
              $7,
              $8,
              $9
            )
            ON CONFLICT (tenant_id, provider)
            DO UPDATE SET
              origin_channel = COALESCE(EXCLUDED.origin_channel, external_connections.origin_channel),
              api_key_enc = EXCLUDED.api_key_enc,
              connection_status = EXCLUDED.connection_status,
              ownership_status = COALESCE(external_connections.ownership_status, EXCLUDED.ownership_status),
              managed_by_third_party = COALESCE(external_connections.managed_by_third_party, EXCLUDED.managed_by_third_party),
              client_admin_gap = COALESCE(external_connections.client_admin_gap, EXCLUDED.client_admin_gap),
              high_governance_risk = COALESCE(external_connections.high_governance_risk, EXCLUDED.high_governance_risk),
              under_claim_review = COALESCE(external_connections.under_claim_review, EXCLUDED.under_claim_review),
              last_error = EXCLUDED.last_error,
              connected_by_user_id = EXCLUDED.connected_by_user_id,
              technical_operator_user_id = COALESCE(EXCLUDED.technical_operator_user_id, external_connections.technical_operator_user_id),
              connected_at = COALESCE(EXCLUDED.connected_at, external_connections.connected_at),
              last_validated_at = EXCLUDED.last_validated_at,
              last_sync_at = COALESCE(EXCLUDED.last_sync_at, external_connections.last_sync_at),
              disconnected_at = NULL,
              revoked_at = NULL,
              governance_updated_at = now(),
              legal_terms_accepted_at = COALESCE(EXCLUDED.legal_terms_accepted_at, external_connections.legal_terms_accepted_at),
              legal_privacy_accepted_at = COALESCE(EXCLUDED.legal_privacy_accepted_at, external_connections.legal_privacy_accepted_at),
              legal_acceptance_version = COALESCE(EXCLUDED.legal_acceptance_version, external_connections.legal_acceptance_version),
              updated_at = now()
            RETURNING id, tenant_id, provider, connection_status AS status, last_sync_at::text, created_at::text, updated_at::text
            `,
            [
              tenantId,
              SHARED_PROVIDER,
              apiKeyEnc,
              status,
              lastError,
              connectedByUserId ?? null,
              legalTermsAcceptedAt ?? null,
              legalPrivacyAcceptedAt ?? null,
              legalAcceptanceVersion ?? null,
              normalizedChannel,
            ]
          );

      if (!saved && external) {
        saved = {
          id: external.id,
          tenant_id: external.tenant_id,
          provider: PROVIDER,
          status: external.status,
          last_sync_at: external.last_sync_at,
          last_error: lastError,
          created_at: external.created_at,
          updated_at: external.updated_at,
        };
      }
    }
  } catch (error) {
    console.error('[accountingStore] failed to sync external_connections', {
      tenantId,
      provider: SHARED_PROVIDER,
      connectedByUserId: connectedByUserId ?? null,
      message: describeStorageError(error),
    });
  }

  if (!saved) {
    throw new Error('No integration storage table available for Holded connection');
  }

  return saved;
}

export async function disconnectAccountingIntegration(
  tenantId: string,
  channelKey?: AccountingIntegrationChannel | null
) {
  const normalizedChannel = normalizeAccountingChannel(channelKey);
  let saved: AccountingIntegrationStatus | null = null;

  if (await hasExternalConnectionsTable()) {
    const external = (await hasExternalConnectionsChannelColumn())
      ? await one<{
          id: string;
          tenant_id: string;
          provider: string;
          status: string;
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        }>(
          `
          INSERT INTO external_connections (
            tenant_id,
            provider,
            channel_key,
            origin_channel,
            credential_type,
            api_key_enc,
            scopes_granted,
            connection_status,
            ownership_status,
            managed_by_third_party,
            client_admin_gap,
            high_governance_risk,
            under_claim_review,
            technical_operator_user_id,
            disconnected_at,
            governance_updated_at,
            last_error
          )
          VALUES (
            $1,
            $2,
            $3,
            $3,
            'api_key',
            NULL,
            ARRAY[]::text[],
            'disconnected',
            'pending_confirmation',
            false,
            true,
            false,
            false,
            NULL,
            now(),
            now(),
            NULL
          )
          ON CONFLICT (tenant_id, provider, channel_key)
          DO UPDATE SET
            origin_channel = COALESCE(external_connections.origin_channel, EXCLUDED.origin_channel),
            connection_status = 'disconnected',
            ownership_status = EXCLUDED.ownership_status,
            managed_by_third_party = false,
            client_admin_gap = false,
            high_governance_risk = false,
            under_claim_review = false,
            provider_account_id = NULL,
            api_key_enc = NULL,
            connected_by_user_id = NULL,
            technical_operator_user_id = NULL,
            connected_at = NULL,
            last_validated_at = NULL,
            last_sync_at = NULL,
            disconnected_at = now(),
            revoked_at = NULL,
            company_identity_json = NULL,
            governance_updated_at = now(),
            legal_terms_accepted_at = NULL,
            legal_privacy_accepted_at = NULL,
            legal_acceptance_version = NULL,
            last_error = NULL,
            updated_at = now()
          RETURNING id, tenant_id, provider, connection_status AS status, last_sync_at::text, created_at::text, updated_at::text
          `,
          [tenantId, SHARED_PROVIDER, normalizedChannel]
        )
      : await one<{
          id: string;
          tenant_id: string;
          provider: string;
          status: string;
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        }>(
          `
          INSERT INTO external_connections (
            tenant_id,
            provider,
            origin_channel,
            credential_type,
            api_key_enc,
            scopes_granted,
            connection_status,
            ownership_status,
            managed_by_third_party,
            client_admin_gap,
            high_governance_risk,
            under_claim_review,
            technical_operator_user_id,
            disconnected_at,
            governance_updated_at,
            last_error
          )
          VALUES (
            $1,
            $2,
            $3,
            'api_key',
            NULL,
            ARRAY[]::text[],
            'disconnected',
            'pending_confirmation',
            false,
            true,
            false,
            false,
            NULL,
            now(),
            now(),
            NULL
          )
          ON CONFLICT (tenant_id, provider)
          DO UPDATE SET
            origin_channel = COALESCE(external_connections.origin_channel, EXCLUDED.origin_channel),
            connection_status = 'disconnected',
            ownership_status = EXCLUDED.ownership_status,
            managed_by_third_party = false,
            client_admin_gap = false,
            high_governance_risk = false,
            under_claim_review = false,
            provider_account_id = NULL,
            api_key_enc = NULL,
            connected_by_user_id = NULL,
            technical_operator_user_id = NULL,
            connected_at = NULL,
            last_validated_at = NULL,
            last_sync_at = NULL,
            disconnected_at = now(),
            revoked_at = NULL,
            company_identity_json = NULL,
            governance_updated_at = now(),
            legal_terms_accepted_at = NULL,
            legal_privacy_accepted_at = NULL,
            legal_acceptance_version = NULL,
            last_error = NULL,
            updated_at = now()
          RETURNING id, tenant_id, provider, connection_status AS status, last_sync_at::text, created_at::text, updated_at::text
          `,
          [tenantId, SHARED_PROVIDER, normalizedChannel]
        );

    if (!saved && external) {
      saved = {
        id: external.id,
        tenant_id: external.tenant_id,
        provider: PROVIDER,
        status: external.status,
        last_sync_at: external.last_sync_at,
        last_error: null,
        created_at: external.created_at,
        updated_at: external.updated_at,
      };
    }
  }

  return saved;
}

export async function markAccountingIntegrationRevoked(
  tenantId: string,
  channelKey?: AccountingIntegrationChannel | null,
  lastError?: string | null
) {
  const normalizedChannel = normalizeAccountingChannel(channelKey);

  if (!(await hasExternalConnectionsTable())) {
    return null;
  }

  const external = (await hasExternalConnectionsChannelColumn())
    ? await one<{
        id: string;
        tenant_id: string;
        provider: string;
        status: string;
        last_sync_at: string | null;
        created_at: string;
        updated_at: string;
      }>(
        `
        INSERT INTO external_connections (
          tenant_id,
          provider,
          channel_key,
          origin_channel,
          credential_type,
          connection_status,
          ownership_status,
          managed_by_third_party,
          client_admin_gap,
          high_governance_risk,
          under_claim_review,
          technical_operator_user_id,
          disconnected_at,
          revoked_at,
          governance_updated_at,
          last_error,
          api_key_enc,
          provider_account_id,
          connected_by_user_id,
          connected_at,
          last_validated_at,
          last_sync_at,
          company_identity_json,
          legal_terms_accepted_at,
          legal_privacy_accepted_at,
          legal_acceptance_version
        )
        VALUES (
          $1,
          $2,
          $3,
          $3,
          'api_key',
          'revoked_api',
          'pending_confirmation',
          false,
          false,
          false,
          false,
          NULL,
          now(),
          now(),
          now(),
          $4,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL
        )
        ON CONFLICT (tenant_id, provider, channel_key)
        DO UPDATE SET
          origin_channel = COALESCE(external_connections.origin_channel, EXCLUDED.origin_channel),
          connection_status = 'revoked_api',
          ownership_status = EXCLUDED.ownership_status,
          managed_by_third_party = false,
          client_admin_gap = false,
          high_governance_risk = false,
          under_claim_review = false,
          provider_account_id = NULL,
          api_key_enc = NULL,
          connected_by_user_id = NULL,
          technical_operator_user_id = NULL,
          connected_at = NULL,
          last_validated_at = NULL,
          last_sync_at = NULL,
          disconnected_at = now(),
          revoked_at = now(),
          company_identity_json = NULL,
          governance_updated_at = now(),
          legal_terms_accepted_at = NULL,
          legal_privacy_accepted_at = NULL,
          legal_acceptance_version = NULL,
          last_error = $4,
          updated_at = now()
        RETURNING id, tenant_id, provider, connection_status AS status, last_sync_at::text, created_at::text, updated_at::text
        `,
        [tenantId, SHARED_PROVIDER, normalizedChannel, lastError ?? null]
      )
    : await one<{
        id: string;
        tenant_id: string;
        provider: string;
        status: string;
        last_sync_at: string | null;
        created_at: string;
        updated_at: string;
      }>(
        `
        INSERT INTO external_connections (
          tenant_id,
          provider,
          origin_channel,
          credential_type,
          connection_status,
          ownership_status,
          managed_by_third_party,
          client_admin_gap,
          high_governance_risk,
          under_claim_review,
          technical_operator_user_id,
          disconnected_at,
          revoked_at,
          governance_updated_at,
          last_error,
          api_key_enc,
          provider_account_id,
          connected_by_user_id,
          connected_at,
          last_validated_at,
          last_sync_at,
          company_identity_json,
          legal_terms_accepted_at,
          legal_privacy_accepted_at,
          legal_acceptance_version
        )
        VALUES (
          $1,
          $2,
          $3,
          'api_key',
          'revoked_api',
          'pending_confirmation',
          false,
          false,
          false,
          false,
          NULL,
          now(),
          now(),
          now(),
          $4,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL,
          NULL
        )
        ON CONFLICT (tenant_id, provider)
        DO UPDATE SET
          origin_channel = COALESCE(external_connections.origin_channel, EXCLUDED.origin_channel),
          connection_status = 'revoked_api',
          ownership_status = EXCLUDED.ownership_status,
          managed_by_third_party = false,
          client_admin_gap = false,
          high_governance_risk = false,
          under_claim_review = false,
          provider_account_id = NULL,
          api_key_enc = NULL,
          connected_by_user_id = NULL,
          technical_operator_user_id = NULL,
          connected_at = NULL,
          last_validated_at = NULL,
          last_sync_at = NULL,
          disconnected_at = now(),
          revoked_at = now(),
          company_identity_json = NULL,
          governance_updated_at = now(),
          legal_terms_accepted_at = NULL,
          legal_privacy_accepted_at = NULL,
          legal_acceptance_version = NULL,
          last_error = $4,
          updated_at = now()
        RETURNING id, tenant_id, provider, connection_status AS status, last_sync_at::text, created_at::text, updated_at::text
        `,
        [tenantId, SHARED_PROVIDER, normalizedChannel, lastError ?? null]
      );

  if (!external) {
    return null;
  }

  return {
    id: external.id,
    tenant_id: external.tenant_id,
    provider: PROVIDER,
    status: external.status,
    last_sync_at: external.last_sync_at,
    last_error: lastError ?? null,
    created_at: external.created_at,
    updated_at: external.updated_at,
  } satisfies AccountingIntegrationStatus;
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
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'pending')
    RETURNING id
    `,
    [tenantId, PROVIDER, entityType, entityId, action, JSON.stringify(payload)]
  );
}

export async function listSyncLogs(tenantId: string, limit: number, cursor?: string | null) {
  const params: unknown[] = [tenantId, PROVIDER, limit];
  const whereCursor = cursor ? ' AND id < $4' : '';
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
    WHERE tenant_id = $1 AND provider = $2 ${whereCursor}
    ORDER BY created_at DESC
    LIMIT $3
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
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    RETURNING id
    `,
    [
      args.tenantId,
      PROVIDER,
      args.outboxId ?? null,
      args.level,
      args.message,
      JSON.stringify(args.data ?? null),
    ]
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
      AND provider = $2
      AND status IN ('pending', 'error')
      AND next_run_at <= now()
    ORDER BY created_at ASC
    LIMIT $3
    `,
    [tenantId, PROVIDER, max]
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

export async function touchIntegrationSyncOk(
  tenantId: string,
  channelKey?: AccountingIntegrationChannel | null
) {
  const normalizedChannel = normalizeAccountingChannel(channelKey);

  if (await hasExternalConnectionsTable()) {
    if (await hasExternalConnectionsChannelColumn()) {
      await query(
        `
        UPDATE external_connections
        SET connection_status = 'connected',
            last_sync_at = now(),
            last_validated_at = now(),
            last_error = NULL,
            disconnected_at = NULL,
            revoked_at = NULL,
            governance_updated_at = now(),
            updated_at = now()
        WHERE tenant_id = $1 AND provider = $2 AND channel_key = $3
        `,
        [tenantId, SHARED_PROVIDER, normalizedChannel]
      );
    } else {
      await query(
        `
        UPDATE external_connections
        SET connection_status = 'connected',
            last_sync_at = now(),
            last_validated_at = now(),
            last_error = NULL,
            disconnected_at = NULL,
            revoked_at = NULL,
            governance_updated_at = now(),
            updated_at = now()
        WHERE tenant_id = $1 AND provider = $2
        `,
        [tenantId, SHARED_PROVIDER]
      );
    }
  }
}

export async function setIntegrationError(
  tenantId: string,
  error: string,
  channelKey?: AccountingIntegrationChannel | null
) {
  const normalizedChannel = normalizeAccountingChannel(channelKey);

  if (await hasExternalConnectionsTable()) {
    if (await hasExternalConnectionsChannelColumn()) {
      await query(
        `
        UPDATE external_connections
        SET connection_status = 'error', last_error = $2, governance_updated_at = now(), updated_at = now()
        WHERE tenant_id = $1 AND provider = $3 AND channel_key = $4
        `,
        [tenantId, error.slice(0, 1000), SHARED_PROVIDER, normalizedChannel]
      );
    } else {
      await query(
        `
        UPDATE external_connections
        SET connection_status = 'error', last_error = $2, governance_updated_at = now(), updated_at = now()
        WHERE tenant_id = $1 AND provider = $3
        `,
        [tenantId, error.slice(0, 1000), SHARED_PROVIDER]
      );
    }
  }
}

export async function listSyncConflicts(tenantId: string, entityType: string) {
  return query<{
    id: string;
    tenant_id: string;
    provider: string;
    entity_type: string;
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
      id,
      tenant_id,
      provider,
      entity_type,
      local_id,
      remote_id,
      reason,
      local_data,
      remote_data,
      status,
      resolution,
      resolved_by,
      created_at::text,
      updated_at::text
    FROM sync_conflicts
    WHERE tenant_id = $1
      AND provider = $2
      AND entity_type = $3
    ORDER BY updated_at DESC
    `,
    [tenantId, PROVIDER, entityType]
  );
}

export type IntegrationMapRow = {
  id: string;
  tenant_id: string;
  provider: string;
  entity_type: string;
  local_id: string;
  remote_id: string;
  hash: string | null;
  last_pushed_at: string | null;
  last_pulled_at: string | null;
  last_remote_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getIntegrationMapByLocal(
  tenantId: string,
  entityType: string,
  localId: string
) {
  return one<IntegrationMapRow>(
    `
    SELECT
      id,
      tenant_id,
      provider,
      entity_type,
      local_id,
      remote_id,
      hash,
      last_pushed_at::text,
      last_pulled_at::text,
      last_remote_updated_at::text,
      created_at::text,
      updated_at::text
    FROM integration_maps
    WHERE tenant_id = $1 AND provider = $2 AND entity_type = $3 AND local_id = $4
    LIMIT 1
    `,
    [tenantId, PROVIDER, entityType, localId]
  );
}

export async function getIntegrationMapByRemote(
  tenantId: string,
  entityType: string,
  remoteId: string
) {
  return one<IntegrationMapRow>(
    `
    SELECT
      id,
      tenant_id,
      provider,
      entity_type,
      local_id,
      remote_id,
      hash,
      last_pushed_at::text,
      last_pulled_at::text,
      last_remote_updated_at::text,
      created_at::text,
      updated_at::text
    FROM integration_maps
    WHERE tenant_id = $1 AND provider = $2 AND entity_type = $3 AND remote_id = $4
    LIMIT 1
    `,
    [tenantId, PROVIDER, entityType, remoteId]
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
    hash,
    lastPushedAt,
    lastPulledAt,
    lastRemoteUpdatedAt,
  } = args;

  return one<IntegrationMapRow>(
    `
    INSERT INTO integration_maps (
      tenant_id, provider, entity_type, local_id, remote_id, hash, last_pushed_at, last_pulled_at, last_remote_updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9::timestamptz)
    ON CONFLICT (tenant_id, provider, entity_type, local_id)
    DO UPDATE SET
      remote_id = EXCLUDED.remote_id,
      hash = COALESCE(EXCLUDED.hash, integration_maps.hash),
      last_pushed_at = COALESCE(EXCLUDED.last_pushed_at, integration_maps.last_pushed_at),
      last_pulled_at = COALESCE(EXCLUDED.last_pulled_at, integration_maps.last_pulled_at),
      last_remote_updated_at = COALESCE(EXCLUDED.last_remote_updated_at, integration_maps.last_remote_updated_at),
      updated_at = now()
    RETURNING
      id,
      tenant_id,
      provider,
      entity_type,
      local_id,
      remote_id,
      hash,
      last_pushed_at::text,
      last_pulled_at::text,
      last_remote_updated_at::text,
      created_at::text,
      updated_at::text
    `,
    [
      tenantId,
      PROVIDER,
      entityType,
      localId,
      remoteId,
      hash ?? null,
      lastPushedAt ?? null,
      lastPulledAt ?? null,
      lastRemoteUpdatedAt ?? null,
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
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, 'open')
    RETURNING id
    `,
    [
      args.tenantId,
      PROVIDER,
      args.entityType,
      args.localId ?? null,
      args.remoteId ?? null,
      args.reason,
      JSON.stringify(args.localData ?? null),
      JSON.stringify(args.remoteData ?? null),
    ]
  );
}
