/** @jest-environment node */

jest.mock('@verifactu/db', () => ({
  prisma: {
    company: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    companyMember: {
      findMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '@verifactu/db';
import { resolveInternalUserId, upsertUser } from './tenants';

const prismaMock = prisma as unknown as {
  user: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

describe('upsertUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses an existing user with the same email without rebinding its auth subject', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'internal-user-id',
      name: 'Isaak User',
      firstName: 'Isaak',
      lastName: 'User',
    });
    prismaMock.user.update.mockResolvedValue({ id: 'internal-user-id' });

    const userId = await upsertUser({
      id: 'firebase-uid-123',
      email: 'demo@example.com',
      name: 'Demo User',
    });

    expect(userId).toBe('internal-user-id');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'internal-user-id' },
      data: expect.objectContaining({
        email: 'demo@example.com',
        name: 'Demo User',
      }),
    });
    expect(prismaMock.user.update.mock.calls[0][0].data).not.toHaveProperty('authSubject');
    expect(prismaMock.user.update.mock.calls[0][0].data).not.toHaveProperty('authProvider');
  });

  it('updates an existing user already linked by auth subject', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 'internal-user-id',
      email: 'demo@example.com',
      name: 'Old Name',
      firstName: 'Old',
      lastName: 'Name',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'internal-user-id',
      name: 'Old Name',
      firstName: 'Old',
      lastName: 'Name',
    });

    const userId = await upsertUser({
      id: 'firebase-uid-123',
      email: 'demo@example.com',
      name: 'Demo User',
    });

    expect(userId).toBe('internal-user-id');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'internal-user-id' },
      data: expect.objectContaining({
        email: 'demo@example.com',
        name: 'Demo User',
        authSubject: 'firebase-uid-123',
        authProvider: 'FIREBASE',
      }),
    });
  });

  it('prefers the existing email owner when the auth subject points to a temporary duplicate user', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 'temp-user-id',
      email: 'unknown-firebase-uid-123@user',
      name: 'Temp User',
      firstName: 'Temp',
      lastName: 'User',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'real-user-id',
      name: 'Real User',
      firstName: 'Real',
      lastName: 'User',
    });
    prismaMock.user.update.mockResolvedValue({ id: 'real-user-id' });

    const userId = await upsertUser({
      id: 'firebase-uid-123',
      email: 'demo@example.com',
      name: 'Demo User',
    });

    expect(userId).toBe('real-user-id');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'real-user-id' },
      data: expect.objectContaining({
        email: 'demo@example.com',
        name: 'Demo User',
      }),
    });
    expect(prismaMock.user.update.mock.calls[0][0].data).not.toHaveProperty('authSubject');
  });

  it('creates a new user when neither id nor email exists', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValue({ id: 'internal-user-id' });

    const userId = await upsertUser({
      id: 'firebase-uid-123',
      email: 'demo@example.com',
      name: 'Demo User',
    });

    expect(userId).toBe('internal-user-id');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'demo@example.com',
        name: 'Demo User',
        authSubject: 'firebase-uid-123',
        authProvider: 'FIREBASE',
      }),
      select: {
        id: true,
      },
    });
  });
});

describe('resolveInternalUserId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves a firebase auth subject to the internal SQL user id', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({ id: 'internal-user-id' });

    const userId = await resolveInternalUserId('firebase-uid-123');

    expect(userId).toBe('internal-user-id');
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ id: 'firebase-uid-123' }, { authSubject: 'firebase-uid-123' }],
      },
      select: {
        id: true,
      },
    });
  });
});
