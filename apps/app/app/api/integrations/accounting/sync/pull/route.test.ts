/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/billing/tenantPlan', () => ({
  canBidirectionalQuotes: jest.fn(),
}));

jest.mock('@/lib/integrations/accountingStore', () => ({
  appendSyncLog: jest.fn(),
  createSyncConflict: jest.fn(),
  getIntegrationMapByRemote: jest.fn(),
  upsertIntegrationMap: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    customer: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/quotes/repo', () => ({
  quoteCreate: jest.fn(),
  quoteFindFirst: jest.fn(),
  quoteUpdate: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { canBidirectionalQuotes } from '@/lib/billing/tenantPlan';
import { appendSyncLog } from '@/lib/integrations/accountingStore';

describe('POST /api/integrations/accounting/sync/pull', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireTenantContext as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });
    (canBidirectionalQuotes as jest.Mock).mockResolvedValue(true);
  });

  it('returns auth error with requestId', async () => {
    (requireTenantContext as jest.Mock).mockResolvedValue({ error: 'Unauthorized', status: 401 });

    const response = await POST(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/sync/pull?entity=quotes',
        {
          method: 'POST',
        }
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
    expect(payload.requestId).toBeTruthy();
  });

  it('returns success with requestId for empty pull payload', async () => {
    const response = await POST(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/sync/pull?entity=quotes&from=cursor-1',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: [] }),
        }
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.requestId).toBeTruthy();
    expect(appendSyncLog).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        message: 'QUOTE_PULL_EMPTY',
        data: expect.objectContaining({ requestId: expect.any(String) }),
      })
    );
  });
});
