/** @jest-environment node */

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedGovernanceService', () => ({
  resolveAccessRequest: jest.fn(),
}));

jest.mock('@/lib/email/holdedGovernanceEmails', () => ({
  sendAccessRequestResolvedEmails: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { PATCH } from './route';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { resolveAccessRequest } from '@/lib/integrations/holdedGovernanceService';
import { sendAccessRequestResolvedEmails } from '@/lib/email/holdedGovernanceEmails';

describe('accounting access request detail route', () => {
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

  it('approves an access request and returns the membership when created', async () => {
    (resolveAccessRequest as jest.Mock).mockResolvedValue({
      accessRequest: {
        requestId: 'request-1',
        connectionId: 'connection-1',
        requester: { userId: 'user-2', name: 'Requester', email: 'requester@example.com' },
        status: 'approved',
        requestedRole: 'viewer',
        message: null,
        createdAt: '2026-04-11T12:00:00.000Z',
        resolvedAt: '2026-04-11T12:05:00.000Z',
      },
      membership: {
        membershipId: 'membership-2',
        userId: 'user-2',
        name: 'Requester',
        email: 'requester@example.com',
        role: 'viewer',
        side: 'client',
        status: 'active',
        invitedAt: '2026-04-11T12:00:00.000Z',
        confirmedAt: '2026-04-11T12:05:00.000Z',
      },
    });
    (sendAccessRequestResolvedEmails as jest.Mock).mockResolvedValue(true);

    const response = await PATCH(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/access-requests/request-1',
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'approved' }),
        }
      ),
      { params: Promise.resolve({ id: 'request-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.notified).toBe(true);
    expect(payload.accessRequest.status).toBe('approved');
    expect(payload.membership.role).toBe('viewer');
  });

  it('keeps the resolution successful when notification delivery fails', async () => {
    (resolveAccessRequest as jest.Mock).mockResolvedValue({
      accessRequest: {
        requestId: 'request-1',
        connectionId: 'connection-1',
        requester: { userId: 'user-2', name: 'Requester', email: 'requester@example.com' },
        status: 'rejected',
        requestedRole: 'viewer',
        message: null,
        createdAt: '2026-04-11T12:00:00.000Z',
        resolvedAt: '2026-04-11T12:05:00.000Z',
      },
      membership: null,
    });
    (sendAccessRequestResolvedEmails as jest.Mock).mockRejectedValue(new Error('smtp_down'));

    const response = await PATCH(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/access-requests/request-1',
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'rejected' }),
        }
      ),
      { params: Promise.resolve({ id: 'request-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.notified).toBe(false);
  });

  it('returns 500 when access request resolution fails unexpectedly', async () => {
    (resolveAccessRequest as jest.Mock).mockRejectedValue(new Error('db_down'));

    const response = await PATCH(
      new NextRequest(
        'https://app.verifactu.business/api/integrations/accounting/access-requests/request-1',
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'approved' }),
        }
      ),
      { params: Promise.resolve({ id: 'request-1' }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe('No se pudo resolver la solicitud de acceso.');
  });
});
