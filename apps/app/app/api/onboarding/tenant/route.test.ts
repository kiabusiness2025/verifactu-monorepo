/** @jest-environment node */

const mockTx = {
  tenant: {
    create: jest.fn(),
  },
  membership: {
    create: jest.fn(),
    upsert: jest.fn(),
  },
  user: {
    upsert: jest.fn(),
  },
  userPreference: {
    upsert: jest.fn(),
  },
  tenantSubscription: {
    create: jest.fn(),
  },
  tenantProfile: {
    upsert: jest.fn(),
  },
};

jest.mock('@/lib/session', () => ({
  getSessionPayload: jest.fn(),
  requireUserId: jest.fn(),
}));

jest.mock('@/lib/tenants', () => ({
  upsertUser: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: {
    tenant: {
      findFirst: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    plan: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    tenantSubscription: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
  },
  default: {
    tenant: {
      findFirst: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    plan: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    tenantSubscription: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
  },
}));

jest.mock('@/lib/email/holdedConnectionEmails', () => ({
  sendWelcomeLifecycleEmails: jest.fn(),
}));

import { POST } from './route';
import { getSessionPayload, requireUserId } from '@/lib/session';
import { upsertUser } from '@/lib/tenants';
import { prisma } from '@/lib/prisma';
import { sendWelcomeLifecycleEmails } from '@/lib/email/holdedConnectionEmails';

const prismaMock = prisma as unknown as {
  tenant: { findFirst: jest.Mock };
  membership: { findFirst: jest.Mock; findMany: jest.Mock };
  plan: { findFirst: jest.Mock; create: jest.Mock };
  tenantSubscription: { findFirst: jest.Mock };
  $transaction: jest.Mock;
};

describe('POST /api/onboarding/tenant', () => {
  beforeEach(() => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Ksenia Ivanova Lopez',
    });
    (requireUserId as jest.Mock).mockReturnValue('user-1');
    (upsertUser as jest.Mock).mockResolvedValue(undefined);

    prismaMock.tenant.findFirst.mockResolvedValue(null);
    prismaMock.membership.findMany.mockResolvedValue([]);
    prismaMock.plan.findFirst.mockResolvedValue({ id: 7 });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof mockTx) => unknown) =>
      callback(mockTx)
    );

    (mockTx.tenant.create as jest.Mock).mockResolvedValue({
      id: 'tenant-1',
      name: 'Empresa Demo',
      legalName: 'Empresa Demo SL',
    });
    (mockTx.membership.create as jest.Mock).mockResolvedValue({ id: 'membership-1' });
    (mockTx.membership.upsert as jest.Mock).mockResolvedValue({ id: 'membership-support' });
    (mockTx.user.upsert as jest.Mock).mockResolvedValue({ id: 'support-user' });
    (mockTx.userPreference.upsert as jest.Mock).mockResolvedValue({ userId: 'user-1' });
    (mockTx.tenantSubscription.create as jest.Mock).mockResolvedValue({
      status: 'trial',
      trialEndsAt: new Date('2026-05-02T00:00:00.000Z'),
    });
    (mockTx.tenantProfile.upsert as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });
    (sendWelcomeLifecycleEmails as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates the tenant profile with company contact data and sends welcome emails', async () => {
    const response = await POST(
      new Request('https://app.verifactu.business/api/onboarding/tenant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Empresa Demo',
          legalName: 'Empresa Demo SL',
          taxId: 'B12345678',
          tradeName: 'Empresa Demo',
          extra: {
            representative: 'Ksenia Ivanova Lopez',
            email: 'info@empresa-demo.es',
            phone: '+34 600 111 222',
          },
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.action).toBe('CREATED');

    expect(upsertUser).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'demo@example.com',
      name: 'Ksenia Ivanova Lopez',
    });

    expect(mockTx.tenantProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          email: 'info@empresa-demo.es',
          phone: '+34 600 111 222',
          representative: 'Ksenia Ivanova Lopez',
        }),
        update: expect.objectContaining({
          email: 'info@empresa-demo.es',
          phone: '+34 600 111 222',
          representative: 'Ksenia Ivanova Lopez',
        }),
      })
    );

    expect(sendWelcomeLifecycleEmails).toHaveBeenCalledWith({
      userEmail: 'demo@example.com',
      userName: 'Ksenia Ivanova Lopez',
      tenantName: 'Empresa Demo',
      tenantLegalName: 'Empresa Demo SL',
      contactName: 'Ksenia Ivanova Lopez',
      contactEmail: 'demo@example.com',
      companyEmail: 'info@empresa-demo.es',
      contactPhone: '+34 600 111 222',
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
