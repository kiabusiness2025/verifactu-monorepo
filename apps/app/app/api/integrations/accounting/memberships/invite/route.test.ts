/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  getTenantHoldedContext: jest.fn(),
  inviteMembership: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import {
  getTenantHoldedContext,
  inviteMembership,
} from '@/lib/integrations/holdedGovernanceService';

describe('accounting memberships invite route', () => {
  beforeEach(() => {
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-1',
      resolvedUserId: 'user-1',
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

  it('blocks membership invites when governance forbids member management', async () => {
    (getTenantHoldedContext as jest.Mock).mockResolvedValue({
      availableActions: {
        manageMembers: {
          blocked: true,
          reason: 'Gestion de miembros bloqueada por gobernanza',
          state: 'under_claim_review',
        },
      },
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

    expect(response.status).toBe(409);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain('Gestion de miembros bloqueada');
    expect(inviteMembership).not.toHaveBeenCalled();
  });

  it('returns 500 when invite fails unexpectedly', async () => {
    (inviteMembership as jest.Mock).mockRejectedValue(new Error('db_timeout'));

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

    expect(response.status).toBe(500);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain('No se pudo invitar al usuario');
  });
});
