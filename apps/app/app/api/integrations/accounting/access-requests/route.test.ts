/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  listAccessRequests: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { listAccessRequests } from '@/lib/integrations/holdedGovernanceService';

describe('accounting access requests route', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      session: { uid: 'session-1', email: 'soporte@verifactu.business' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists access requests and returns a request id header', async () => {
    (listAccessRequests as jest.Mock).mockResolvedValue([
      {
        requestId: 'request-1',
        connectionId: 'connection-1',
        requester: { userId: 'user-2', name: 'Requester', email: 'requester@example.com' },
        status: 'submitted',
        requestedRole: 'viewer',
        message: 'Necesito acceso',
        createdAt: '2026-04-11T12:00:00.000Z',
        resolvedAt: null,
      },
    ]);

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/access-requests')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].requestId).toBe('request-1');
  });
});
