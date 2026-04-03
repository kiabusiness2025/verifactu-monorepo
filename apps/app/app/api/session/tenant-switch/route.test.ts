/** @jest-environment node */

jest.mock('../../../../lib/session', () => ({
  getSessionPayload: jest.fn(),
  requireUserId: jest.fn(),
}));

jest.mock('../../../../lib/authz', () => ({
  ensureRole: jest.fn(),
}));

jest.mock('../../../../lib/preferences', () => ({
  setUserPreferredTenant: jest.fn(),
}));

jest.mock('../../../../lib/memberships', () => ({
  fetchMembership: jest.fn(),
}));

jest.mock('../../../../lib/tenants', () => ({
  resolveInternalUserId: jest.fn(),
  upsertUser: jest.fn(),
}));

jest.mock('@verifactu/utils', () => ({
  signSessionToken: jest.fn(() => 'signed-session-token'),
  readSessionSecret: jest.fn(() => 'test-secret'),
  buildSessionCookieOptions: jest.fn(() => ({
    name: 'vf_session',
    value: 'signed-session-token',
    path: '/',
    httpOnly: true,
  })),
}));

import { POST } from './route';
import { ensureRole } from '../../../../lib/authz';
import { fetchMembership } from '../../../../lib/memberships';
import { setUserPreferredTenant } from '../../../../lib/preferences';
import { getSessionPayload, requireUserId } from '../../../../lib/session';
import { resolveInternalUserId, upsertUser } from '../../../../lib/tenants';

describe('POST /api/session/tenant-switch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'firebase-uid-1',
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'member',
      tenantId: 'tenant-old',
    });
    (requireUserId as jest.Mock).mockReturnValue('firebase-uid-1');
    (ensureRole as jest.Mock).mockReturnValue(null);
    (resolveInternalUserId as jest.Mock).mockResolvedValue('internal-user-1');
    (fetchMembership as jest.Mock).mockResolvedValue({
      userId: 'internal-user-1',
      tenantId: 'tenant-new',
      role: 'owner',
      status: 'active',
    });
    (setUserPreferredTenant as jest.Mock).mockResolvedValue(undefined);
    (upsertUser as jest.Mock).mockResolvedValue('internal-user-1');
  });

  it('switches tenant using the internal SQL user id for membership and preferences', async () => {
    const response = await POST(
      new Request('https://app.verifactu.business/api/session/tenant-switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId: 'tenant-new' }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, tenantId: 'tenant-new', role: 'owner' });
    expect(resolveInternalUserId).toHaveBeenCalledWith('firebase-uid-1');
    expect(fetchMembership).toHaveBeenCalledWith('internal-user-1', 'tenant-new');
    expect(setUserPreferredTenant).toHaveBeenCalledWith('internal-user-1', 'tenant-new');
    expect(upsertUser).not.toHaveBeenCalled();
  });

  it('falls back to user upsert when the internal user id is not resolved yet', async () => {
    (resolveInternalUserId as jest.Mock).mockResolvedValueOnce(null);

    const response = await POST(
      new Request('https://app.verifactu.business/api/session/tenant-switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId: 'tenant-new' }),
      })
    );

    expect(response.status).toBe(200);
    expect(upsertUser).toHaveBeenCalledWith({
      id: 'firebase-uid-1',
      email: 'demo@example.com',
      name: 'Demo User',
    });
    expect(fetchMembership).toHaveBeenCalledWith('internal-user-1', 'tenant-new');
  });

  it('returns 403 when the resolved user still has no active membership for the tenant', async () => {
    (fetchMembership as jest.Mock).mockResolvedValueOnce(null);

    const response = await POST(
      new Request('https://app.verifactu.business/api/session/tenant-switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId: 'tenant-new' }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({ ok: false, error: 'no active membership for tenant' });
    expect(setUserPreferredTenant).not.toHaveBeenCalled();
  });
});
