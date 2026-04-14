/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  listMemberships: jest.fn(),
  getTenantHoldedContext: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  getTenantHoldedContext,
  listMemberships,
} from '@/lib/integrations/holdedGovernanceService';

describe('accounting memberships route', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      session: { uid: 'session-1', email: 'soporte@verifactu.business' },
    });
    (getTenantHoldedContext as jest.Mock).mockResolvedValue({
      availableActions: {
        manageMembers: { blocked: false, reason: 'ok', state: 'connected' },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists memberships and available actions', async () => {
    (listMemberships as jest.Mock).mockResolvedValue([
      {
        membershipId: 'membership-1',
        userId: 'user-2',
        name: 'Client Admin',
        email: 'client@example.com',
        role: 'company_admin',
        side: 'client',
        status: 'active',
        invitedAt: '2026-04-11T12:00:00.000Z',
        confirmedAt: '2026-04-11T12:05:00.000Z',
      },
    ]);

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/memberships')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items).toHaveLength(1);
    expect(payload.availableActions.manageMembers.blocked).toBe(false);
  });

  it('returns 500 when memberships listing fails unexpectedly', async () => {
    (listMemberships as jest.Mock).mockRejectedValue(new Error('db_timeout'));

    const response = await GET(
      new NextRequest('https://app.verifactu.business/api/integrations/accounting/memberships')
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toContain('No se pudo cargar la lista de usuarios');
  });
});
