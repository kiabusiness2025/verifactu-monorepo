/** @jest-environment node */

const mockOne = jest.fn();
const mockQuery = jest.fn();
const mockResolveSharedHoldedConnectionStatusForTenant = jest.fn();

jest.mock('@/lib/db', () => ({
  one: (...args: unknown[]) => mockOne(...args),
  query: (...args: unknown[]) => mockQuery(...args),
}));

jest.mock('@/lib/integrations/holdedConnectionResolver', () => ({
  resolveSharedHoldedConnectionStatusForTenant: (...args: unknown[]) =>
    mockResolveSharedHoldedConnectionStatusForTenant(...args),
}));

describe('accountingStore Holded external connections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockQuery.mockResolvedValue([]);
    mockResolveSharedHoldedConnectionStatusForTenant.mockResolvedValue(null);
  });

  it('lists Holded from the shared resolver instead of tenant_integrations', async () => {
    mockQuery.mockResolvedValue([
      {
        id: 'drive-1',
        tenant_id: 'tenant-1',
        provider: 'google_drive',
        status: 'connected',
        last_sync_at: null,
        last_error: null,
        created_at: '2026-04-04T10:00:00.000Z',
        updated_at: '2026-04-04T10:00:00.000Z',
      },
    ]);
    mockResolveSharedHoldedConnectionStatusForTenant.mockResolvedValue({
      id: 'holded-1',
      tenantId: 'tenant-1',
      provider: 'holded',
      providerAccountId: 'company-1',
      credentialType: 'api_key',
      status: 'connected',
      channel: 'dashboard',
      lastSyncAt: '2026-04-04T12:00:00.000Z',
      lastError: null,
      source: 'external_connection',
    });

    const { listTenantIntegrations } = await import('./accountingStore');
    const rows = await listTenantIntegrations('tenant-1');

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('provider <> $2'), [
      'tenant-1',
      'accounting_api',
    ]);
    expect(rows).toEqual([
      {
        id: 'holded-1',
        tenant_id: 'tenant-1',
        provider: 'accounting_api',
        status: 'connected',
        last_sync_at: '2026-04-04T12:00:00.000Z',
        last_error: null,
        created_at: null,
        updated_at: null,
      },
      {
        id: 'drive-1',
        tenant_id: 'tenant-1',
        provider: 'google_drive',
        status: 'connected',
        last_sync_at: null,
        last_error: null,
        created_at: '2026-04-04T10:00:00.000Z',
        updated_at: '2026-04-04T10:00:00.000Z',
      },
    ]);
  });

  it('writes Holded connections only to external_connections', async () => {
    mockOne
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({
        id: 'ext-1',
        tenant_id: 'tenant-1',
        provider: 'holded',
        status: 'connected',
        last_sync_at: '2026-04-04T12:00:00.000Z',
        created_at: '2026-04-04T12:00:00.000Z',
        updated_at: '2026-04-04T12:00:00.000Z',
      });

    const { upsertAccountingIntegration } = await import('./accountingStore');
    const result = await upsertAccountingIntegration({
      tenantId: 'tenant-1',
      apiKeyEnc: 'enc-key',
      status: 'connected',
      lastError: null,
      channelKey: 'chatgpt',
      connectedByUserId: 'user-1',
      legalAcceptanceVersion: 'holded_connection_v1',
      legalTermsAcceptedAt: new Date('2026-04-04T12:00:00.000Z'),
      legalPrivacyAcceptedAt: new Date('2026-04-04T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      provider: 'accounting_api',
      status: 'connected',
      last_error: null,
    });
    expect(
      mockOne.mock.calls.some(
        ([text]) => typeof text === 'string' && text.includes('INSERT INTO tenant_integrations')
      )
    ).toBe(false);
  });

  it('disconnects Holded only in external_connections for dashboard', async () => {
    mockOne
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({
        id: 'ext-1',
        tenant_id: 'tenant-1',
        provider: 'holded',
        status: 'disconnected',
        last_sync_at: '2026-04-03T12:00:00.000Z',
        created_at: '2026-04-04T12:00:00.000Z',
        updated_at: '2026-04-04T12:05:00.000Z',
      });

    const { disconnectAccountingIntegration } = await import('./accountingStore');
    const result = await disconnectAccountingIntegration('tenant-1', 'dashboard');

    expect(result).toMatchObject({
      provider: 'accounting_api',
      status: 'disconnected',
    });
    expect(
      mockOne.mock.calls.some(
        ([text]) => typeof text === 'string' && text.includes('tenant_integrations')
      )
    ).toBe(false);
    expect(
      mockOne.mock.calls.some(
        ([text]) => typeof text === 'string' && text.includes('INSERT INTO external_connections')
      )
    ).toBe(true);
  });

  it('marks Holded sync success only in external_connections for dashboard', async () => {
    mockOne.mockResolvedValueOnce({ exists: true }).mockResolvedValueOnce({ exists: true });

    const { touchIntegrationSyncOk } = await import('./accountingStore');
    await touchIntegrationSyncOk('tenant-1', 'dashboard');

    expect(
      mockOne.mock.calls.some(
        ([text]) => typeof text === 'string' && text.includes('tenant_integrations')
      )
    ).toBe(false);
    expect(
      mockQuery.mock.calls.some(
        ([text]) => typeof text === 'string' && text.includes('UPDATE external_connections')
      )
    ).toBe(true);
  });

  it('persists Holded last_error only in external_connections', async () => {
    mockOne.mockResolvedValueOnce({ exists: true }).mockResolvedValueOnce({ exists: true });

    const { setIntegrationError } = await import('./accountingStore');
    await setIntegrationError('tenant-1', 'holded validation failed', 'dashboard');

    expect(
      mockOne.mock.calls.some(
        ([text]) => typeof text === 'string' && text.includes('tenant_integrations')
      )
    ).toBe(false);
    expect(
      mockQuery.mock.calls.some(
        ([text]) =>
          typeof text === 'string' &&
          text.includes('UPDATE external_connections') &&
          text.includes('last_error = $2')
      )
    ).toBe(true);
    expect(
      mockQuery.mock.calls.some(
        ([text]) => typeof text === 'string' && text.includes('UPDATE tenant_integrations')
      )
    ).toBe(false);
  });
});
