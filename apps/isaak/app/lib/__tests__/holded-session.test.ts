/**
 * Tests for getHoldedSession() — session resolution + C1 security invariant.
 *
 * C1 invariant: getHoldedSession() MUST NEVER create a new membership as a
 * side-effect of reading the session cookie. It may only reactivate existing
 * inactive memberships (cross-domain handoff scenario).
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const cookieStoreMock = { get: jest.fn() };

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

const resolveSharedTenantSessionMock = jest.fn();
const getSharedSessionPayloadMock = jest.fn();

jest.mock('@verifactu/auth', () => ({
  resolveSharedTenantSession: (...args: unknown[]) => resolveSharedTenantSessionMock(...args),
  getSharedSessionPayloadFromCookieStore: (...args: unknown[]) =>
    getSharedSessionPayloadMock(...args),
}));

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    membership: { updateMany: jest.fn(), findUnique: jest.fn() },
    userPreference: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}));

import { cookies } from 'next/headers';
import { prisma } from '@/app/lib/prisma';
import { getHoldedSession } from '../holded-session';

type UserMock = jest.MockedFunction<typeof prisma.user.findFirst>;
type UpdateManyMock = jest.MockedFunction<typeof prisma.membership.updateMany>;
type PrefMock = jest.MockedFunction<typeof prisma.userPreference.findUnique>;

const mockUserFind = prisma.user.findFirst as unknown as UserMock;
const mockUserUpdate = prisma.user.update as unknown as jest.MockedFunction<
  typeof prisma.user.update
>;
const mockUserCreate = prisma.user.create as unknown as jest.MockedFunction<
  typeof prisma.user.create
>;
const mockUpdateMany = prisma.membership.updateMany as unknown as UpdateManyMock;
const mockPrefFind = prisma.userPreference.findUnique as unknown as PrefMock;
const mockPrefUpsert = prisma.userPreference.upsert as unknown as jest.MockedFunction<
  typeof prisma.userPreference.upsert
>;

const VALID_PAYLOAD = {
  uid: 'firebase-uid-1',
  tenantId: 'tenant-abc',
  email: 'user@example.com',
  name: 'Ana García',
};

const EXISTING_USER = {
  id: 'user-id-1',
  email: 'user@example.com',
  name: 'Ana García',
  isBlocked: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  (cookies as jest.Mock).mockResolvedValue(cookieStoreMock);
  mockUpdateMany.mockResolvedValue({ count: 0 });
  mockPrefUpsert.mockResolvedValue({} as never);
});

// ── Path 1: resolveSharedTenantSession succeeds ───────────────────────────────

describe('path 1 — resolveSharedTenantSession finds user directly', () => {
  it('returns session with resolved userId and tenantId', async () => {
    resolveSharedTenantSessionMock.mockResolvedValue({
      payload: VALID_PAYLOAD,
      tenantId: 'tenant-abc',
      userId: 'user-id-1',
      email: 'user@example.com',
      name: 'Ana García',
    });
    mockPrefFind.mockResolvedValue(null);

    const session = await getHoldedSession();
    expect(session?.userId).toBe('user-id-1');
    expect(session?.tenantId).toBe('tenant-abc');
  });

  it('applies preferredTenantId when user has an active preferred tenant', async () => {
    resolveSharedTenantSessionMock.mockResolvedValue({
      payload: VALID_PAYLOAD,
      tenantId: 'tenant-abc',
      userId: 'user-id-1',
      email: 'user@example.com',
      name: 'Ana',
    });
    mockPrefFind.mockResolvedValue({ preferredTenantId: 'tenant-preferred' });
    (prisma.membership.findUnique as jest.Mock).mockResolvedValue({ status: 'active' });

    const session = await getHoldedSession();
    expect(session?.tenantId).toBe('tenant-preferred');
  });

  it('falls back to cookie tenantId when preferred tenant membership is inactive', async () => {
    resolveSharedTenantSessionMock.mockResolvedValue({
      payload: VALID_PAYLOAD,
      tenantId: 'tenant-abc',
      userId: 'user-id-1',
      email: 'user@example.com',
      name: 'Ana',
    });
    mockPrefFind.mockResolvedValue({ preferredTenantId: 'tenant-preferred' });
    (prisma.membership.findUnique as jest.Mock).mockResolvedValue({ status: 'invited' });

    const session = await getHoldedSession();
    expect(session?.tenantId).toBe('tenant-abc');
  });

  it('falls back to cookie tenantId when preferred membership does not exist', async () => {
    resolveSharedTenantSessionMock.mockResolvedValue({
      payload: VALID_PAYLOAD,
      tenantId: 'tenant-abc',
      userId: 'user-id-1',
      email: 'user@example.com',
      name: 'Ana',
    });
    mockPrefFind.mockResolvedValue({ preferredTenantId: 'tenant-preferred' });
    (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

    const session = await getHoldedSession();
    expect(session?.tenantId).toBe('tenant-abc');
  });
});

// ── Path 1: blocked user ──────────────────────────────────────────────────────

describe('blocked user', () => {
  it('returns null when resolveSharedTenantSession returns null (blocked)', async () => {
    resolveSharedTenantSessionMock.mockResolvedValue(null);
    getSharedSessionPayloadMock.mockResolvedValue(null);

    const session = await getHoldedSession();
    expect(session).toBeNull();
  });

  it('returns null when user.isBlocked is true (path 2)', async () => {
    resolveSharedTenantSessionMock.mockResolvedValue(null);
    getSharedSessionPayloadMock.mockResolvedValue(VALID_PAYLOAD);
    mockUserFind.mockResolvedValue({ ...EXISTING_USER, isBlocked: true });

    const session = await getHoldedSession();
    expect(session).toBeNull();
  });
});

// ── Path 2: cross-domain handoff (user not yet in Prisma by authSubject) ──────

describe('path 2 — cross-domain handoff via raw payload', () => {
  beforeEach(() => {
    resolveSharedTenantSessionMock.mockResolvedValue(null);
    getSharedSessionPayloadMock.mockResolvedValue(VALID_PAYLOAD);
  });

  it('returns null when payload is missing', async () => {
    getSharedSessionPayloadMock.mockResolvedValue(null);
    const session = await getHoldedSession();
    expect(session).toBeNull();
  });

  it('returns null when payload lacks uid', async () => {
    getSharedSessionPayloadMock.mockResolvedValue({ tenantId: 'tenant-abc', email: 'a@b.com' });
    const session = await getHoldedSession();
    expect(session).toBeNull();
  });

  it('returns null when payload lacks tenantId', async () => {
    getSharedSessionPayloadMock.mockResolvedValue({ uid: 'uid', email: 'a@b.com' });
    const session = await getHoldedSession();
    expect(session).toBeNull();
  });

  it('updates existing user and returns session', async () => {
    mockUserFind.mockResolvedValue(EXISTING_USER);
    mockUserUpdate.mockResolvedValue(EXISTING_USER);

    const session = await getHoldedSession();
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-id-1' },
        data: expect.objectContaining({ authSubject: VALID_PAYLOAD.uid }),
      })
    );
    expect(session?.userId).toBe('user-id-1');
    expect(session?.tenantId).toBe('tenant-abc');
  });

  it('creates new user when no existing user found', async () => {
    mockUserFind.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue(EXISTING_USER);

    const session = await getHoldedSession();
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'user@example.com', authProvider: 'FIREBASE' }),
      })
    );
    expect(session?.userId).toBe('user-id-1');
  });
});

// ── C1 invariant ──────────────────────────────────────────────────────────────

describe('C1 invariant — no auto-membership creation', () => {
  beforeEach(() => {
    resolveSharedTenantSessionMock.mockResolvedValue(null);
    getSharedSessionPayloadMock.mockResolvedValue(VALID_PAYLOAD);
    mockUserFind.mockResolvedValue(EXISTING_USER);
    mockUserUpdate.mockResolvedValue(EXISTING_USER);
  });

  it('calls updateMany (not upsert/create) to reactivate membership', async () => {
    await getHoldedSession();
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-abc',
          userId: 'user-id-1',
        }),
        data: { status: 'active' },
      })
    );
  });

  it('never calls membership.create or membership.upsert', async () => {
    await getHoldedSession();
    expect(prisma.membership.upsert).toBeUndefined();
    expect((prisma.membership as Record<string, unknown>).create).toBeUndefined();
  });

  it('updateMany targets only inactive memberships (status: {not: active})', async () => {
    await getHoldedSession();
    const call = mockUpdateMany.mock.calls[0][0];
    expect(call.where).toEqual(expect.objectContaining({ status: { not: 'active' } }));
  });

  it('still returns a session even if updateMany finds no rows to update', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    const session = await getHoldedSession();
    expect(session?.userId).toBe('user-id-1');
  });

  it('still returns a session even if updateMany throws', async () => {
    mockUpdateMany.mockRejectedValue(new Error('DB error'));
    const session = await getHoldedSession();
    expect(session?.userId).toBe('user-id-1');
  });
});

// ── Name resolution ───────────────────────────────────────────────────────────

describe('user name normalization', () => {
  beforeEach(() => {
    resolveSharedTenantSessionMock.mockResolvedValue(null);
    getSharedSessionPayloadMock.mockResolvedValue(VALID_PAYLOAD);
    mockUserFind.mockResolvedValue(null);
  });

  it('uses payload.name when present', async () => {
    mockUserCreate.mockResolvedValue({ ...EXISTING_USER, name: 'Ana García' });
    await getHoldedSession();
    const createCall = mockUserCreate.mock.calls[0][0];
    expect(createCall.data.name).toBe('Ana García');
  });

  it('falls back to email prefix when payload has no name', async () => {
    getSharedSessionPayloadMock.mockResolvedValue({ ...VALID_PAYLOAD, name: undefined });
    mockUserCreate.mockResolvedValue({ ...EXISTING_USER, name: 'user' });
    await getHoldedSession();
    const createCall = mockUserCreate.mock.calls[0][0];
    expect(createCall.data.name).toBe('user');
  });

  it('falls back to existing user name when payload.name is empty', async () => {
    resolveSharedTenantSessionMock.mockResolvedValue(null);
    getSharedSessionPayloadMock.mockResolvedValue({ ...VALID_PAYLOAD, name: '  ' });
    mockUserFind.mockResolvedValue({ ...EXISTING_USER, name: 'Existing Name' });
    mockUserUpdate.mockResolvedValue({ ...EXISTING_USER, name: 'Existing Name' });
    await getHoldedSession();
    const updateCall = mockUserUpdate.mock.calls[0][0];
    expect(updateCall.data.name).toBe('Existing Name');
  });
});
