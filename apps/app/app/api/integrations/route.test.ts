/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/accountingStore', () => ({
  listTenantIntegrations: jest.fn(),
}));

import { GET } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { listTenantIntegrations } from '@/lib/integrations/accountingStore';

describe('GET /api/integrations', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
    });
    (listTenantIntegrations as jest.Mock).mockResolvedValue([
      {
        provider: 'accounting_api',
        status: 'connected',
        last_sync_at: '2026-04-04T12:00:00.000Z',
        last_error: null,
      },
      {
        provider: 'google_drive',
        status: 'connected',
        last_sync_at: null,
        last_error: null,
      },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the synthesized Holded integration entry alongside legacy table integrations', async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listTenantIntegrations).toHaveBeenCalledWith('tenant-1');
    expect(payload.items).toEqual([
      {
        provider: 'accounting_api',
        status: 'connected',
        lastSyncAt: '2026-04-04T12:00:00.000Z',
        lastError: null,
      },
      {
        provider: 'google_drive',
        status: 'connected',
        lastSyncAt: null,
        lastError: null,
      },
    ]);
  });
});
