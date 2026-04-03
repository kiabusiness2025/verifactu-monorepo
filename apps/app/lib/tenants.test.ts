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
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

describe('upsertUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reconciles an existing user with the same email to the current session uid', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'internal-user-id',
      name: 'Isaak User',
      firstName: 'Isaak',
      lastName: 'User',
    });
    prismaMock.user.update.mockResolvedValue({ id: 'firebase-uid-123' });

    await upsertUser({
      id: 'firebase-uid-123',
      email: 'demo@example.com',
      name: 'Demo User',
    });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'internal-user-id' },
      data: expect.objectContaining({
        id: 'firebase-uid-123',
        email: 'demo@example.com',
        name: 'Demo User',
      }),
    });
  });

  it('creates a new user when neither id nor email exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'firebase-uid-123' });

    await upsertUser({
      id: 'firebase-uid-123',
      email: 'demo@example.com',
      name: 'Demo User',
    });

    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'firebase-uid-123',
        email: 'demo@example.com',
        name: 'Demo User',
      }),
    });
  });
});
