/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/accountingStore', () => ({
  listSyncLogs: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { listSyncLogs } from '@/lib/integrations/accountingStore';

describe('GET /api/integrations/accounting/logs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireTenantContext as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });
  });

  it('returns sync logs with request id header', async () => {
    (listSyncLogs as jest.Mock).mockResolvedValue([
      { id: 'log-1', level: 'info', message: 'SYNC_OK invoice:inv-1' },
    ]);

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/logs?limit=1')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(payload.items).toHaveLength(1);
    expect(payload.requestId).toBeTruthy();
    expect(payload.nextCursor).toBe('log-1');
  });

  it('returns 500 when sync logs lookup fails', async () => {
    (listSyncLogs as jest.Mock).mockRejectedValue(new Error('db_down'));

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/logs')
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(payload.error).toBe('No se pudieron cargar los logs de sincronizacion.');
  });
});
