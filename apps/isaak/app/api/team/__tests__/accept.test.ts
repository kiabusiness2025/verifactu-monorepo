/** @jest-environment node */

/**
 * Tests for GET /api/team/accept?token=<inviteToken>
 *
 * Verifies:
 * - Short/missing token → 400
 * - Unauthenticated → redirect to auth
 * - Token not found → redirect with not_found error
 * - Expired token → redirect with expired error
 * - Email mismatch → redirect with email_mismatch error
 * - Happy path (same user) → activates membership, sets preferred tenant, redirects to /chat
 * - Stub user transfer (different userId) → re-points membership to authenticated user
 * - JSON path query (uses findFirst with metadataJson path filter, not findMany)
 */

const getSessionMock = jest.fn();
const buildIsaakAuthUrlMock = jest.fn();

jest.mock('@/app/lib/holded-session', () => ({
  getHoldedSession: () => getSessionMock(),
}));

jest.mock('@/app/lib/isaak-navigation', () => ({
  buildIsaakAuthUrl: (...args: unknown[]) => buildIsaakAuthUrlMock(...args),
  ISAAK_PUBLIC_URL: 'https://isaak.verifactu.business',
}));

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    membership: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userPreference: { upsert: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('@prisma/client', () => ({
  Prisma: { DbNull: null },
}));

import { NextRequest } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { GET } from '../accept/route';

const ISAAK = 'https://isaak.verifactu.business';
const TOKEN = 'a'.repeat(32); // valid-length token

const SESSION = { userId: 'user-real', tenantId: 'tenant-xyz', email: 'real@example.com' };
const INVITED_MEMBERSHIP = {
  id: 'membership-1',
  tenantId: 'tenant-target',
  userId: 'user-real',
  role: 'member',
  invitedBy: null,
  status: 'invited',
  metadataJson: { inviteToken: TOKEN, inviteTokenExpiresAt: null },
  user: { id: 'user-real', email: 'real@example.com', authSubject: 'fb-uid' },
};

function makeRequest(token = TOKEN) {
  return new NextRequest(`${ISAAK}/api/team/accept?token=${token}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks NO resetea la queue de mockResolvedValueOnce, así que los
  // describes hijos que añaden mockResolvedValueOnce dejan residuos entre
  // tests. Reseteamos findFirst explícitamente.
  (prisma.membership.findFirst as jest.Mock).mockReset();
  buildIsaakAuthUrlMock.mockReturnValue(`${ISAAK}/auth?source=team_invite_accept`);
  (prisma.membership.update as jest.Mock).mockResolvedValue({});
  (prisma.membership.delete as jest.Mock).mockResolvedValue({});
  (prisma.userPreference.upsert as jest.Mock).mockResolvedValue({});
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: 'real@example.com' });
  (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);
});

// ── Input validation ──────────────────────────────────────────────────────────

describe('input validation', () => {
  it('returns 400 when token is absent', async () => {
    getSessionMock.mockResolvedValue(SESSION);
    const res = await GET(new NextRequest(`${ISAAK}/api/team/accept`));
    expect(res.status).toBe(400);
  });

  it('returns 400 when token is shorter than 32 chars', async () => {
    getSessionMock.mockResolvedValue(SESSION);
    const res = await GET(makeRequest('short'));
    expect(res.status).toBe(400);
  });
});

// ── Auth guard ────────────────────────────────────────────────────────────────

describe('authentication guard', () => {
  it('redirects to auth when session is null', async () => {
    getSessionMock.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(buildIsaakAuthUrlMock).toHaveBeenCalledWith('team_invite_accept', expect.any(String));
  });

  it('redirects to auth when session has no userId', async () => {
    getSessionMock.mockResolvedValue({ tenantId: 'tenant-xyz' });
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
  });
});

// ── Token not found ───────────────────────────────────────────────────────────

describe('token lookup', () => {
  it('redirects with not_found when no membership matches token', async () => {
    getSessionMock.mockResolvedValue(SESSION);
    (prisma.membership.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('teamInviteError=not_found');
  });

  it('uses findFirst with JSON path filter (not findMany)', async () => {
    getSessionMock.mockResolvedValue(SESSION);
    (prisma.membership.findFirst as jest.Mock).mockResolvedValue(null);
    await GET(makeRequest());
    const calls = (prisma.membership.findFirst as jest.Mock).mock.calls;
    // SEC C4: lookup primario por hash SHA-256 del token (no full scan)
    expect(calls[0][0].where).toEqual(
      expect.objectContaining({
        status: 'invited',
        metadataJson: { path: ['inviteTokenHash'], equals: expect.any(String) },
      })
    );
    // Fallback legacy: invitaciones pre-C4 con inviteToken raw
    expect(calls[1][0].where).toEqual(
      expect.objectContaining({
        status: 'invited',
        metadataJson: { path: ['inviteToken'], equals: TOKEN },
      })
    );
  });
});

// ── Token expiry ──────────────────────────────────────────────────────────────

describe('token expiry', () => {
  it('redirects with expired when token past its expiresAt', async () => {
    getSessionMock.mockResolvedValue(SESSION);
    const expiredMembership = {
      ...INVITED_MEMBERSHIP,
      metadataJson: {
        inviteToken: TOKEN,
        inviteTokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
      },
    };
    (prisma.membership.findFirst as jest.Mock).mockResolvedValue(expiredMembership);
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('teamInviteError=expired');
  });

  it('accepts token with null expiresAt (no expiry set)', async () => {
    getSessionMock.mockResolvedValue(SESSION);
    (prisma.membership.findFirst as jest.Mock).mockResolvedValue(INVITED_MEMBERSHIP);
    (prisma.membership.findFirst as jest.Mock).mockResolvedValueOnce(INVITED_MEMBERSHIP);
    (prisma.membership.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'membership-1' });
    const res = await GET(makeRequest());
    // Should not redirect with expired
    expect(res.headers.get('location')).not.toContain('teamInviteError=expired');
  });
});

// ── Email mismatch ────────────────────────────────────────────────────────────

describe('email verification', () => {
  it('redirects with email_mismatch when caller email differs from invited email', async () => {
    getSessionMock.mockResolvedValue({ ...SESSION, userId: 'user-other' });
    (prisma.membership.findFirst as jest.Mock).mockResolvedValue(INVITED_MEMBERSHIP);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: 'other@example.com' });
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('teamInviteError=email_mismatch');
  });

  it('accepts when emails match case-insensitively', async () => {
    getSessionMock.mockResolvedValue(SESSION);
    (prisma.membership.findFirst as jest.Mock)
      .mockResolvedValueOnce(INVITED_MEMBERSHIP)
      .mockResolvedValueOnce({ id: 'membership-1' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: 'REAL@EXAMPLE.COM' });
    const res = await GET(makeRequest());
    expect(res.headers.get('location')).not.toContain('email_mismatch');
  });
});

// ── Happy path ────────────────────────────────────────────────────────────────

describe('happy path — same userId', () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue(SESSION);
    (prisma.membership.findFirst as jest.Mock)
      .mockResolvedValueOnce(INVITED_MEMBERSHIP)
      .mockResolvedValueOnce({ id: 'membership-1' });
  });

  it('redirects to /chat?teamInviteAccepted=1', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/chat?teamInviteAccepted=1');
  });

  it('activates membership with status=active and confirmedAt', async () => {
    await GET(makeRequest());
    expect(prisma.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'active', confirmedAt: expect.any(Date) }),
      })
    );
  });

  it('clears inviteToken from metadataJson (sets to null/DbNull)', async () => {
    await GET(makeRequest());
    expect(prisma.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ metadataJson: null }),
      })
    );
  });

  it('sets preferredTenantId to the invite target tenant', async () => {
    await GET(makeRequest());
    expect(prisma.userPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { preferredTenantId: 'tenant-target' },
        create: expect.objectContaining({ preferredTenantId: 'tenant-target' }),
      })
    );
  });
});

// ── Stub user transfer ────────────────────────────────────────────────────────

describe('stub user transfer — different userId', () => {
  const STUB_MEMBERSHIP = {
    ...INVITED_MEMBERSHIP,
    id: 'membership-stub', // override id so route uses correct id for transfer update
    userId: 'user-stub', // stub user created at invite time
    user: { id: 'user-stub', email: 'real@example.com', authSubject: null },
  };

  beforeEach(() => {
    getSessionMock.mockResolvedValue(SESSION); // userId: 'user-real'
    (prisma.membership.findFirst as jest.Mock)
      .mockResolvedValueOnce(STUB_MEMBERSHIP)
      .mockResolvedValueOnce({ id: 'membership-stub' });
    (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null); // no existing membership for real user
  });

  it('updates stub membership to point to the real authenticated user', async () => {
    await GET(makeRequest());
    expect(prisma.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'membership-stub' },
        data: expect.objectContaining({ userId: 'user-real' }),
      })
    );
  });

  it('redirects to /chat on successful transfer', async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get('location')).toContain('/chat?teamInviteAccepted=1');
  });
});
