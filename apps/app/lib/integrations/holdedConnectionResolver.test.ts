/** @jest-environment node */

export {};

const mockOne = jest.fn();

jest.mock('@/lib/db', () => ({
  one: (...args: unknown[]) => mockOne(...args),
}));

jest.mock('@/lib/integrations/secretCrypto', () => ({
  decryptIntegrationSecret: jest.fn((value: string) => `decrypted:${value}`),
}));

describe('holdedConnectionResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  function mockExternalConnectionsSchema(input?: {
    channelKey?: boolean;
    lastError?: boolean;
    originChannel?: boolean;
    ownershipStatus?: boolean;
    managedByThirdParty?: boolean;
    clientAdminGap?: boolean;
    highGovernanceRisk?: boolean;
    underClaimReview?: boolean;
    technicalOperatorUserId?: boolean;
  }) {
    const availability = {
      channelKey: true,
      lastError: true,
      originChannel: true,
      ownershipStatus: true,
      managedByThirdParty: true,
      clientAdminGap: true,
      highGovernanceRisk: true,
      underClaimReview: true,
      technicalOperatorUserId: true,
      ...input,
    };

    mockOne.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('information_schema.tables')) {
        return { exists: true };
      }

      if (text.includes("table_name = 'external_connections' AND column_name = 'channel_key'")) {
        return { exists: availability.channelKey };
      }

      if (text.includes("table_name = 'external_connections' AND column_name = $1")) {
        const column = params?.[0];
        const columnMap: Record<string, boolean> = {
          origin_channel: availability.originChannel,
          last_error: availability.lastError,
          ownership_status: availability.ownershipStatus,
          managed_by_third_party: availability.managedByThirdParty,
          client_admin_gap: availability.clientAdminGap,
          high_governance_risk: availability.highGovernanceRisk,
          under_claim_review: availability.underClaimReview,
          technical_operator_user_id: availability.technicalOperatorUserId,
        };
        return { exists: columnMap[String(column)] ?? false };
      }

      if (text.includes('FROM external_connections')) {
        return null;
      }

      return null;
    });
  }

  it.each([true, false])(
    'builds a valid external connection select when last_error column availability is %s',
    async (hasLastErrorColumn) => {
      let externalQuery = '';

      mockExternalConnectionsSchema({ lastError: hasLastErrorColumn });
      mockOne.mockImplementation(async (text: string, params?: unknown[]) => {
        if (text.includes('FROM external_connections')) {
          externalQuery = text;
          return null;
        }

        if (text.includes('information_schema.tables')) {
          return { exists: true };
        }

        if (text.includes("table_name = 'external_connections' AND column_name = 'channel_key'")) {
          return { exists: true };
        }

        if (text.includes("table_name = 'external_connections' AND column_name = $1")) {
          return { exists: params?.[0] === 'last_error' ? hasLastErrorColumn : true };
        }

        return null;
      });

      const { resolveSharedHoldedConnectionStatusForTenant } =
        await import('./holdedConnectionResolver');

      await expect(
        resolveSharedHoldedConnectionStatusForTenant('tenant-1', 'chatgpt')
      ).resolves.toBeNull();

      expect(externalQuery).toContain('FROM external_connections');
      expect(externalQuery).not.toMatch(/,\s*FROM external_connections/);
    }
  );

  it('prefers external_connections for dashboard status when both storages exist', async () => {
    mockOne.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('information_schema.tables')) {
        return { exists: true };
      }

      if (text.includes("table_name = 'external_connections' AND column_name = 'channel_key'")) {
        return { exists: true };
      }

      if (text.includes("table_name = 'external_connections' AND column_name = $1")) {
        return { exists: true };
      }

      if (text.includes('FROM external_connections')) {
        return {
          id: 'ext-1',
          tenant_id: 'tenant-1',
          provider: 'holded',
          channel_key: 'dashboard',
          origin_channel: 'dashboard',
          provider_account_id: 'company-1',
          credential_type: 'api_key',
          api_key_enc: 'enc-ext',
          connection_status: 'connected',
          ownership_status: 'pending_confirmation',
          managed_by_third_party: false,
          client_admin_gap: true,
          high_governance_risk: false,
          under_claim_review: false,
          connected_by_user_id: null,
          technical_operator_user_id: 'user-1',
          connected_at: '2026-04-04T09:00:00.000Z',
          last_validated_at: '2026-04-04T09:30:00.000Z',
          last_sync_at: '2026-04-04T10:00:00.000Z',
          last_error: null,
        };
      }

      return null;
    });

    const { resolveSharedHoldedConnectionStatusForTenant } =
      await import('./holdedConnectionResolver');
    const result = await resolveSharedHoldedConnectionStatusForTenant('tenant-1', 'dashboard');

    expect(result).toEqual({
      id: 'ext-1',
      tenantId: 'tenant-1',
      provider: 'holded',
      providerAccountId: 'company-1',
      credentialType: 'api_key',
      status: 'connected',
      channel: 'dashboard',
      originChannel: 'dashboard',
      ownershipStatus: 'pending_confirmation',
      managedByThirdParty: false,
      clientAdminGap: true,
      highGovernanceRisk: false,
      underClaimReview: false,
      technicalOperatorUserId: 'user-1',
      connectedAt: '2026-04-04T09:00:00.000Z',
      lastValidatedAt: '2026-04-04T09:30:00.000Z',
      lastSyncAt: '2026-04-04T10:00:00.000Z',
      lastError: null,
      source: 'external_connection',
    });
  });

  it('does not fall back to tenant_integrations for dashboard when the external row is missing', async () => {
    mockExternalConnectionsSchema();

    const {
      hasSharedHoldedConnectionForTenant,
      resolveSharedHoldedConnectionForTenant,
      resolveSharedHoldedConnectionStatusForTenant,
    } = await import('./holdedConnectionResolver');

    await expect(hasSharedHoldedConnectionForTenant('tenant-1', 'dashboard')).resolves.toBe(false);
    await expect(
      resolveSharedHoldedConnectionForTenant('tenant-1', 'dashboard')
    ).resolves.toBeNull();
    await expect(
      resolveSharedHoldedConnectionStatusForTenant('tenant-1', 'dashboard')
    ).resolves.toBeNull();
  });

  it('treats an external disconnected dashboard row as authoritative and does not fall back to legacy', async () => {
    mockOne.mockImplementation(async (text: string) => {
      if (text.includes('information_schema.tables')) {
        return { exists: true };
      }

      if (text.includes('information_schema.columns')) {
        return { exists: true };
      }

      if (text.includes('FROM external_connections')) {
        return {
          id: 'ext-disconnected',
          tenant_id: 'tenant-1',
          provider: 'holded',
          channel_key: 'dashboard',
          origin_channel: 'dashboard',
          provider_account_id: null,
          credential_type: 'api_key',
          api_key_enc: null,
          connection_status: 'disconnected',
          ownership_status: null,
          managed_by_third_party: false,
          client_admin_gap: false,
          high_governance_risk: false,
          under_claim_review: false,
          connected_by_user_id: null,
          technical_operator_user_id: null,
          connected_at: null,
          last_validated_at: null,
          last_sync_at: '2026-04-04T10:00:00.000Z',
          last_error: null,
        };
      }

      return null;
    });

    const {
      hasSharedHoldedConnectionForTenant,
      resolveSharedHoldedConnectionForTenant,
      resolveSharedHoldedConnectionStatusForTenant,
    } = await import('./holdedConnectionResolver');

    await expect(hasSharedHoldedConnectionForTenant('tenant-1', 'dashboard')).resolves.toBe(false);
    await expect(
      resolveSharedHoldedConnectionForTenant('tenant-1', 'dashboard')
    ).resolves.toBeNull();
    await expect(
      resolveSharedHoldedConnectionStatusForTenant('tenant-1', 'dashboard')
    ).resolves.toEqual({
      id: 'ext-disconnected',
      tenantId: 'tenant-1',
      provider: 'holded',
      providerAccountId: null,
      credentialType: 'api_key',
      status: 'disconnected',
      channel: 'dashboard',
      originChannel: 'dashboard',
      ownershipStatus: null,
      managedByThirdParty: false,
      clientAdminGap: false,
      highGovernanceRisk: false,
      underClaimReview: false,
      technicalOperatorUserId: null,
      connectedAt: null,
      lastValidatedAt: null,
      lastSyncAt: '2026-04-04T10:00:00.000Z',
      lastError: null,
      source: 'external_connection',
    });
  });

  it('does not fall back to tenant_integrations for chatgpt', async () => {
    mockExternalConnectionsSchema();

    const { resolveSharedHoldedConnectionStatusForTenant } =
      await import('./holdedConnectionResolver');
    const result = await resolveSharedHoldedConnectionStatusForTenant('tenant-1', 'chatgpt');

    expect(result).toBeNull();
  });
});
