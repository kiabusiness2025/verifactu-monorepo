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
import { upsertUser } from './tenants';

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

  it('links an existing user with the same email to the firebase subject without rewriting the id', async () => {
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
        authSubject: 'firebase-uid-123',
        authProvider: 'FIREBASE',
      }),
    });
  });

  it('updates an existing user already linked by auth subject', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce({
      id: 'internal-user-id',
      email: 'demo@example.com',
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
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
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
