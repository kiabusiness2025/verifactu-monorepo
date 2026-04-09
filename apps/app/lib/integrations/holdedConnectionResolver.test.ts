/** @jest-environment node */

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

  it('prefers external_connections for dashboard status when both storages exist', async () => {
    mockOne.mockImplementation(async (text: string) => {
      if (text.includes('information_schema.tables')) {
        return { exists: true };
      }

      if (text.includes("column_name = 'channel_key'")) {
        return { exists: true };
      }

      if (text.includes("column_name = 'last_error'")) {
        return { exists: true };
      }

      if (text.includes('FROM external_connections')) {
        return {
          id: 'ext-1',
          tenant_id: 'tenant-1',
          provider: 'holded',
          channel_key: 'dashboard',
          provider_account_id: 'company-1',
          credential_type: 'api_key',
          api_key_enc: 'enc-ext',
          connection_status: 'connected',
          connected_by_user_id: null,
          connected_at: null,
          last_validated_at: null,
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
      lastSyncAt: '2026-04-04T10:00:00.000Z',
      lastError: null,
      source: 'external_connection',
    });
  });

  it('does not fall back to tenant_integrations for dashboard when the external row is missing', async () => {
    mockOne.mockImplementation(async (text: string) => {
      if (text.includes('information_schema.tables')) {
        return { exists: true };
      }

      if (text.includes("column_name = 'channel_key'")) {
        return { exists: true };
      }

      if (text.includes("column_name = 'last_error'")) {
        return { exists: true };
      }

      if (text.includes('FROM external_connections')) {
        return null;
      }

      if (text.includes('tenant_integrations')) {
        throw new Error('dashboard should not read tenant_integrations');
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
          provider_account_id: null,
          credential_type: 'api_key',
          api_key_enc: null,
          connection_status: 'disconnected',
          connected_by_user_id: null,
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
      lastSyncAt: '2026-04-04T10:00:00.000Z',
      lastError: null,
      source: 'external_connection',
    });
  });

  it('does not fall back to tenant_integrations for chatgpt', async () => {
    mockOne.mockImplementation(async (text: string) => {
      if (text.includes('information_schema.tables')) {
        return { exists: true };
      }

      if (text.includes("column_name = 'channel_key'")) {
        return { exists: true };
      }

      if (text.includes("column_name = 'last_error'")) {
        return { exists: true };
      }

      if (text.includes('FROM external_connections')) {
        return null;
      }

      if (text.includes('tenant_integrations')) {
        throw new Error('chatgpt should not read tenant_integrations');
      }

      return null;
    });

    const { resolveSharedHoldedConnectionStatusForTenant } =
      await import('./holdedConnectionResolver');
    const result = await resolveSharedHoldedConnectionStatusForTenant('tenant-1', 'chatgpt');

    expect(result).toBeNull();
  });
});
