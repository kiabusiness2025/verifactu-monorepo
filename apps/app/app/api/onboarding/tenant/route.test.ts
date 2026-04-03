/** @jest-environment node */

const mockTx = {
  tenant: {
    create: jest.fn(),
    update: jest.fn(),
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
    findFirst: jest.fn(),
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
      findUnique: jest.fn(),
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
      findUnique: jest.fn(),
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
  tenant: { findFirst: jest.Mock; findUnique: jest.Mock };
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
    (upsertUser as jest.Mock).mockResolvedValue('internal-user-1');

    prismaMock.tenant.findFirst.mockResolvedValue(null);
    prismaMock.tenant.findUnique.mockResolvedValue(null);
    prismaMock.membership.findMany.mockResolvedValue([]);
    prismaMock.membership.findFirst.mockResolvedValue(null);
    prismaMock.plan.findFirst.mockResolvedValue({ id: 7 });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof mockTx) => unknown) =>
      callback(mockTx)
    );

    (mockTx.tenant.create as jest.Mock).mockResolvedValue({
      id: 'tenant-1',
      name: 'Empresa Demo',
      legalName: 'Empresa Demo SL',
    });
    (mockTx.tenant.update as jest.Mock).mockResolvedValue({
      id: 'tenant-1',
      name: 'Empresa Demo',
      legalName: 'Empresa Demo SL',
    });
    (mockTx.membership.create as jest.Mock).mockResolvedValue({ id: 'membership-1' });
    (mockTx.membership.upsert as jest.Mock).mockResolvedValue({ id: 'membership-support' });
    (mockTx.user.upsert as jest.Mock).mockResolvedValue({ id: 'support-user' });
    (mockTx.userPreference.upsert as jest.Mock).mockResolvedValue({ userId: 'user-1' });
    (mockTx.tenantSubscription.findFirst as jest.Mock).mockResolvedValue(null);
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
            contactFirstName: 'Ksenia',
            contactLastName: 'Ivanova Lopez',
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
      firstName: 'Ksenia',
      lastName: 'Ivanova Lopez',
    });

    expect(mockTx.membership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'internal-user-1',
      }),
    });

    expect(mockTx.userPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'internal-user-1' },
      })
    );

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

  it('reuses the current placeholder tenant when the caller confirms real company data after Holded validation', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Ksenia Ivanova Lopez',
      tenantId: 'tenant-temp',
    });
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 'tenant-temp',
      name: 'Isaak Workspace',
      legalName: null,
      nif: null,
      isDemo: true,
      profile: {
        tradeName: 'Isaak Workspace',
        taxId: null,
      },
    });
    prismaMock.membership.findFirst.mockResolvedValue({ tenantId: 'tenant-temp' });
    (mockTx.tenantSubscription.findFirst as jest.Mock).mockResolvedValue({
      status: 'trial',
      trialEndsAt: new Date('2026-05-02T00:00:00.000Z'),
    });

    const response = await POST(
      new Request('https://app.verifactu.business/api/onboarding/tenant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reuseCurrentTenant: true,
          name: 'Empresa Demo',
          legalName: 'Empresa Demo SL',
          taxId: 'B12345678',
          tradeName: 'Empresa Demo',
          extra: {
            representative: 'Ksenia Ivanova Lopez',
            contactFirstName: 'Ksenia',
            contactLastName: 'Ivanova Lopez',
            email: 'info@empresa-demo.es',
            phone: '+34 600 111 222',
          },
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.action).toBe('UPDATED_CURRENT');
    expect(mockTx.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant-temp' },
        data: expect.objectContaining({
          name: 'Empresa Demo',
          legalName: 'Empresa Demo SL',
          nif: 'B12345678',
          isDemo: false,
        }),
      })
    );
    expect(mockTx.tenant.create).not.toHaveBeenCalled();
    expect(prismaMock.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'internal-user-1',
        }),
      })
    );
  });
});
