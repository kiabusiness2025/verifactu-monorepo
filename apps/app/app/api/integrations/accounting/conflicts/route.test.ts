/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/billing/tenantPlan', () => ({
  canBidirectionalQuotes: jest.fn(),
}));

jest.mock('@/lib/integrations/accountingStore', () => ({
  listSyncConflicts: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { canBidirectionalQuotes } from '@/lib/billing/tenantPlan';
import { listSyncConflicts } from '@/lib/integrations/accountingStore';

describe('GET /api/integrations/accounting/conflicts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireTenantContext as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });
    (canBidirectionalQuotes as jest.Mock).mockResolvedValue(true);
  });

  it('returns quote conflicts with request id header', async () => {
    (listSyncConflicts as jest.Mock).mockResolvedValue([
      { id: 'conflict-1', entityType: 'quote', entityId: 'quote-1' },
    ]);

    const response = await GET(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/conflicts?entity=quotes'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(payload.items).toHaveLength(1);
    expect(payload.requestId).toBeTruthy();
  });

  it('returns 500 when conflict lookup fails', async () => {
    (listSyncConflicts as jest.Mock).mockRejectedValue(new Error('db_down'));

    const response = await GET(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/conflicts?entity=quotes'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(payload.error).toBe('No se pudieron cargar los conflictos de sincronizacion.');
  });
});
