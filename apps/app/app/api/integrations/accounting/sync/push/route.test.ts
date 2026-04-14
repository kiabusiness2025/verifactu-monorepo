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
  createSyncOutbox: jest.fn(),
  getIntegrationMapByLocal: jest.fn(),
  upsertIntegrationMap: jest.fn(),
}));

jest.mock('@/lib/integrations/syncHash', () => ({
  buildPayloadHash: jest.fn(() => 'hash-1'),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/lib/quotes/repo', () => ({
  quoteFindFirst: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { canBidirectionalQuotes } from '@/lib/billing/tenantPlan';
import { getIntegrationMapByLocal } from '@/lib/integrations/accountingStore';
import { quoteFindFirst } from '@/lib/quotes/repo';

describe('POST /api/integrations/accounting/sync/push', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireTenantContext as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });
    (canBidirectionalQuotes as jest.Mock).mockResolvedValue(true);
  });

  it('returns auth error with requestId', async () => {
    (requireTenantContext as jest.Mock).mockResolvedValue({ error: 'Unauthorized', status: 401 });

    const response = await POST(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/sync/push?entity=quotes&id=q-1',
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

  it('returns hash_unchanged with requestId when quote payload did not change', async () => {
    (quoteFindFirst as jest.Mock).mockResolvedValue({
      id: 'q-1',
      number: 'Q-1',
      status: 'draft',
      issueDate: new Date('2026-04-14T10:00:00.000Z'),
      validUntil: null,
      customerId: 'c-1',
      currency: 'EUR',
      lines: [],
      totals: {},
      notes: null,
      updatedAt: new Date('2026-04-14T10:00:00.000Z'),
      customer: { id: 'c-1', name: 'Client', nif: 'B123', email: 'client@example.com' },
    });
    (getIntegrationMapByLocal as jest.Mock).mockResolvedValue({
      remote_id: 'remote-q-1',
      hash: 'hash-1',
      last_pulled_at: null,
      last_pushed_at: null,
      last_remote_updated_at: null,
    });

    const response = await POST(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/sync/push?entity=quotes&id=q-1',
        {
          method: 'POST',
        }
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.skipped).toBe(true);
    expect(payload.reason).toBe('hash_unchanged');
    expect(payload.requestId).toBeTruthy();
  });
});
