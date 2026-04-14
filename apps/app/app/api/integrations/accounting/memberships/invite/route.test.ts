/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  inviteMembership: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { inviteMembership } from '@/lib/integrations/holdedGovernanceService';

describe('accounting memberships invite route', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      resolvedUserId: 'user-1',
      session: { uid: 'session-1', email: 'soporte@verifactu.business' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('invites a membership', async () => {
    (inviteMembership as jest.Mock).mockResolvedValue({
      membershipId: 'membership-1',
      userId: 'user-2',
      name: 'Client Admin',
      email: 'client@example.com',
      role: 'company_admin',
      side: 'client',
      status: 'invited',
      invitedAt: '2026-04-11T12:00:00.000Z',
      confirmedAt: null,
    });

    const response = await POST(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/memberships/invite',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email: 'client@example.com',
            role: 'company_admin',
            side: 'client',
          }),
        }
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.membership.role).toBe('company_admin');
  });

  it('rejects non-admin sessions', async () => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      resolvedUserId: 'user-1',
      session: { uid: 'session-1', email: 'user@example.com' },
    });

    const response = await POST(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/memberships/invite',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email: 'client@example.com',
            role: 'company_admin',
            side: 'client',
          }),
        }
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain('Acceso restringido');
    expect(inviteMembership).not.toHaveBeenCalled();
  });
});
