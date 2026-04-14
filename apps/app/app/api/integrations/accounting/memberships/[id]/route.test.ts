/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  updateMembership: jest.fn(),
  removeMembership: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { DELETE, PATCH } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { removeMembership, updateMembership } from '@/lib/integrations/holdedGovernanceService';

describe('accounting membership detail route', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      session: { uid: 'session-1', email: 'soporte@verifactu.business' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates a membership', async () => {
    (updateMembership as jest.Mock).mockResolvedValue({
      membershipId: 'membership-1',
      userId: 'user-2',
      name: 'Client Admin',
      email: 'client@example.com',
      role: 'company_admin',
      side: 'client',
      status: 'active',
      invitedAt: '2026-04-11T12:00:00.000Z',
      confirmedAt: '2026-04-11T12:05:00.000Z',
    });

    const response = await PATCH(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/memberships/membership-1',
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        }
      ),
      { params: Promise.resolve({ id: 'membership-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.membership.status).toBe('active');
  });

  it('returns a conflict when deleting the last client admin', async () => {
    (removeMembership as jest.Mock).mockRejectedValue(new Error('last_company_admin'));

    const response = await DELETE(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/memberships/membership-1',
        {
          method: 'DELETE',
        }
      ),
      { params: Promise.resolve({ id: 'membership-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain('ultimo company_admin');
  });
});
