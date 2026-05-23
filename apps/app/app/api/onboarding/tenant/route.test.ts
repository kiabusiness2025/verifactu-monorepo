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

jest.mock('@/lib/integrations/holdedOnboardingSession', () => ({
  isVerifiedHoldedOnboardingIdentity: jest.fn(
    (session: { email?: string | null; emailVerified?: boolean }) =>
      Boolean(session?.email && session?.emailVerified)
  ),
  resolveHoldedOnboardingSessionFromHeaders: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedVerifiedEmailIdentities', () => ({
  rememberVerifiedHoldedEmailIdentity: jest.fn(async () => null),
}));

jest.mock('@/lib/integrations/companyNotificationEmailStore', () => ({
  upsertConfirmedCompanyNotificationEmail: jest.fn(async () => null),
}));

jest.mock('@/lib/oauth/mcp', () => ({
  mintHoldedOnboardingTokenForSubject: jest.fn(async () => 'refreshed-onboarding-token'),
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

jest.mock('@/lib/tenantProfileSchema', () => ({
  getTenantProfileColumnAvailability: jest.fn(async () => ({
    representativeRole: true,
    website: true,
    cnaeCode: true,
    cnaeText: true,
    postalCode: true,
    country: true,
    legalForm: true,
    status: true,
    capitalSocial: true,
    employees: true,
    sales: true,
    salesYear: true,
    lastBalanceDate: true,
  })),
  LEGACY_TENANT_PROFILE_COLUMN_AVAILABILITY: {
    representativeRole: false,
    website: false,
    cnaeCode: false,
    cnaeText: false,
    postalCode: false,
    country: false,
    legalForm: false,
    status: false,
    capitalSocial: false,
    employees: false,
    sales: false,
    salesYear: false,
    lastBalanceDate: false,
  },
  isMissingTenantProfileColumnError: jest.fn(
    (error: unknown) =>
      String(error).includes('tenant_profiles.') && String(error).includes('does not exist')
  ),
  resetTenantProfileColumnAvailabilityCache: jest.fn(),
}));

import { POST } from './route';
import { getSessionPayload, requireUserId } from '@/lib/session';
import { resolveHoldedOnboardingSessionFromHeaders } from '@/lib/integrations/holdedOnboardingSession';
import { rememberVerifiedHoldedEmailIdentity } from '@/lib/integrations/holdedVerifiedEmailIdentities';
import { upsertConfirmedCompanyNotificationEmail } from '@/lib/integrations/companyNotificationEmailStore';
import { mintHoldedOnboardingTokenForSubject } from '@/lib/oauth/mcp';
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
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue(null);
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
    (mockTx.userPreference.upsert as jest.Mock).mockResolvedValue({ userId: 'user-1' });
    (mockTx.tenantSubscription.findFirst as jest.Mock).mockResolvedValue(null);
    (mockTx.tenantSubscription.create as jest.Mock).mockResolvedValue({
      status: 'trial',
      trialEndsAt: new Date('2026-05-02T00:00:00.000Z'),
    });
    (mockTx.tenantProfile.upsert as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });
    (sendWelcomeLifecycleEmails as jest.Mock).mockResolvedValue([]);
    (rememberVerifiedHoldedEmailIdentity as jest.Mock).mockResolvedValue(null);
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
          country: 'Espana',
          extra: {
            representative: 'Ksenia Ivanova Lopez',
            representativeRole: 'owner',
            contactFirstName: 'Ksenia',
            contactLastName: 'Ivanova Lopez',
            email: 'info@empresa-demo.es',
            phone: '+34 600 111 222',
            cnae: 'M - Actividades profesionales, cientificas y tecnicas',
            cnaeCode: 'M',
            cnaeText: 'Actividades profesionales, cientificas y tecnicas',
            website: 'https://empresa-demo.es',
            address: 'Calle Mayor 1',
            postalCode: '28001',
            city: 'Madrid',
            province: 'Madrid',
            country: 'Espana',
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

    expect(mockTx.user.upsert).not.toHaveBeenCalled();
    expect(mockTx.membership.upsert).not.toHaveBeenCalled();

    expect(mockTx.tenantProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          email: 'info@empresa-demo.es',
          phone: '+34 600 111 222',
          representative: 'Ksenia Ivanova Lopez',
          representativeRole: 'owner',
          cnaeCode: 'M',
          cnaeText: 'Actividades profesionales, cientificas y tecnicas',
          website: 'https://empresa-demo.es',
          address: 'Calle Mayor 1',
          postalCode: '28001',
          city: 'Madrid',
          province: 'Madrid',
          country: 'Espana',
        }),
        update: expect.objectContaining({
          email: 'info@empresa-demo.es',
          phone: '+34 600 111 222',
          representative: 'Ksenia Ivanova Lopez',
          representativeRole: 'owner',
          cnaeCode: 'M',
          cnaeText: 'Actividades profesionales, cientificas y tecnicas',
          website: 'https://empresa-demo.es',
          address: 'Calle Mayor 1',
          postalCode: '28001',
          city: 'Madrid',
          province: 'Madrid',
          country: 'Espana',
        }),
        select: { tenantId: true },
      })
    );

    expect(rememberVerifiedHoldedEmailIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'user-1',
        email: 'demo@example.com',
        tenantId: 'tenant-1',
        prefill: expect.objectContaining({
          companyLegalName: 'Empresa Demo SL',
          companyTaxId: 'B12345678',
          contactFirstName: 'Ksenia',
          contactLastName: 'Ivanova Lopez',
          contactRole: 'owner',
          companySectorCode: 'M',
          companySectorLabel: 'Actividades profesionales, cientificas y tecnicas',
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

    expect(upsertConfirmedCompanyNotificationEmail).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      email: 'info@empresa-demo.es',
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('skips the early welcome email when the request belongs to direct connector onboarding', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue(null);
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'demo@example.com',
      name: 'Ksenia Ivanova Lopez',
      authMethod: 'email',
      emailVerified: true,
      firstName: 'Ksenia',
      lastName: 'Ivanova Lopez',
      tenantId: null,
      verifiedAt: '2026-01-15T10:00:00.000Z',
    });

    const response = await POST(
      new Request('https://app.verifactu.business/api/onboarding/tenant', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-holded-onboarding-token': 'onboarding-token-123',
        },
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
          },
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(sendWelcomeLifecycleEmails).not.toHaveBeenCalled();
  });

  it('rejects tenant creation when direct connector email verification is still pending', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue(null);
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'demo@example.com',
      name: 'Ksenia Ivanova Lopez',
      authMethod: 'email',
      emailVerified: false,
      firstName: 'Ksenia',
      lastName: 'Ivanova Lopez',
      tenantId: null,
      verifiedAt: null,
    });

    const response = await POST(
      new Request('https://app.verifactu.business/api/onboarding/tenant', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-holded-onboarding-token': 'onboarding-token-123',
        },
        body: JSON.stringify({
          name: 'Empresa Demo',
          legalName: 'Empresa Demo SL',
          taxId: 'B12345678',
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe('identity verification required');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects tenant creation when a signed session exists but the onboarding email is still pending verification', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Ksenia Ivanova Lopez',
    });
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'holded@example.com',
      name: 'Holded Contact',
      authMethod: 'email',
      emailVerified: false,
      firstName: 'Holded',
      lastName: 'Contact',
      tenantId: null,
      verifiedAt: null,
    });

    const response = await POST(
      new Request('https://app.verifactu.business/api/onboarding/tenant', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-holded-onboarding-token': 'onboarding-token-123',
        },
        body: JSON.stringify({
          name: 'Empresa Demo',
          legalName: 'Empresa Demo SL',
          taxId: 'B12345678',
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe('identity verification required');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
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

  it('allows creating another real tenant even when the user already has a trial tenant', async () => {
    prismaMock.membership.findMany.mockResolvedValue([{ tenantId: 'tenant-existing' }]);
    prismaMock.tenantSubscription.findFirst.mockResolvedValue({ status: 'trial' });

    const response = await POST(
      new Request('https://app.verifactu.business/api/onboarding/tenant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Segunda Empresa',
          legalName: 'Segunda Empresa SL',
          taxId: 'B87654321',
          tradeName: 'Segunda Empresa',
          extra: {
            representative: 'Ksenia Ivanova Lopez',
            contactFirstName: 'Ksenia',
            contactLastName: 'Ivanova Lopez',
            email: 'info@segunda-empresa.es',
          },
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockTx.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Segunda Empresa',
          nif: 'B87654321',
        }),
      })
    );
  });

  it('returns a refreshed onboarding token when the direct connector flow creates the tenant without session login', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue(null);
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'guest@example.com',
      name: 'Connector Guest',
      tenantId: null,
      authMethod: 'email',
      emailVerified: true,
      firstName: 'Connector',
      lastName: 'Guest',
      verifiedAt: '2026-04-06T12:00:00.000Z',
    });

    const response = await POST(
      new Request('https://app.verifactu.business/api/onboarding/tenant', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-holded-onboarding-token': 'onboarding-token-123',
        },
        body: JSON.stringify({
          name: 'Empresa Demo',
          legalName: 'Empresa Demo SL',
          taxId: 'B12345678',
          tradeName: 'Empresa Demo',
          extra: {
            representative: 'Connector Guest',
            contactFirstName: 'Connector',
            contactLastName: 'Guest',
            email: 'info@empresa-demo.es',
            phone: '+34 600 111 222',
          },
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.onboardingToken).toBe('refreshed-onboarding-token');
    expect(mintHoldedOnboardingTokenForSubject).toHaveBeenCalledWith({
      uid: 'holded-guest-1',
      email: 'guest@example.com',
      name: 'Connector Guest',
      tenantId: 'tenant-1',
      tenantBound: true,
      authMethod: 'email',
      emailVerified: true,
      firstName: 'Connector',
      lastName: 'Guest',
      verifiedAt: '2026-04-06T12:00:00.000Z',
    });
  });

  it('retries tenant profile upsert with the legacy schema when production rejects an optional column', async () => {
    (mockTx.tenantProfile.upsert as jest.Mock)
      .mockRejectedValueOnce(
        new Error(
          'Invalid `prisma.tenantProfile.upsert()` invocation: The column `tenant_profiles.representative_role` does not exist in the current database.'
        )
      )
      .mockResolvedValueOnce({ tenantId: 'tenant-1' });

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
            representativeRole: 'owner',
            contactFirstName: 'Ksenia',
            contactLastName: 'Ivanova Lopez',
            email: 'info@empresa-demo.es',
            phone: '+34 600 111 222',
            cnae: 'M - Actividades profesionales, cientificas y tecnicas',
            cnaeCode: 'M',
            cnaeText: 'Actividades profesionales, cientificas y tecnicas',
            website: 'https://empresa-demo.es',
            address: 'Calle Mayor 1',
            postalCode: '28001',
            city: 'Madrid',
            province: 'Madrid',
            country: 'Espana',
          },
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(mockTx.tenantProfile.upsert).toHaveBeenCalledTimes(2);

    const secondCall = (mockTx.tenantProfile.upsert as jest.Mock).mock.calls[1][0];
    expect(secondCall.select).toEqual({ tenantId: true });
    expect(secondCall.create.representativeRole).toBeUndefined();
    expect(secondCall.create.website).toBeUndefined();
    expect(secondCall.create.cnaeCode).toBeUndefined();
    expect(secondCall.create.cnaeText).toBeUndefined();
    expect(secondCall.create.postalCode).toBeUndefined();
    expect(secondCall.create.country).toBeUndefined();
    expect(secondCall.update.representativeRole).toBeUndefined();
    expect(secondCall.update.website).toBeUndefined();
    expect(secondCall.update.cnaeCode).toBeUndefined();
    expect(secondCall.update.cnaeText).toBeUndefined();
    expect(secondCall.update.postalCode).toBeUndefined();
    expect(secondCall.update.country).toBeUndefined();
    expect(sendWelcomeLifecycleEmails).toHaveBeenCalledTimes(1);
  });

  it('preserves the verified onboarding email and name when refreshing the token during a signed-session flow', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'session@example.com',
      name: 'Session User',
      tenantId: 'tenant-session',
    });
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'verified@holded.com',
      name: 'Verified Holded User',
      tenantId: null,
      authMethod: 'google',
      emailVerified: true,
      firstName: 'Verified',
      lastName: 'Holded User',
      verifiedAt: '2026-04-07T09:30:00.000Z',
    });

    const response = await POST(
      new Request('https://app.verifactu.business/api/onboarding/tenant', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-holded-onboarding-token': 'onboarding-token-123',
        },
        body: JSON.stringify({
          name: 'Empresa Demo',
          legalName: 'Empresa Demo SL',
          taxId: 'B12345678',
          tradeName: 'Empresa Demo',
          extra: {
            representative: 'Verified Holded User',
            contactFirstName: 'Verified',
            contactLastName: 'Holded User',
            email: 'info@empresa-demo.es',
          },
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.onboardingToken).toBe('refreshed-onboarding-token');
    expect(mintHoldedOnboardingTokenForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'holded-guest-1',
        email: 'verified@holded.com',
        name: 'Verified Holded User',
        tenantId: 'tenant-1',
        authMethod: 'google',
        emailVerified: true,
      })
    );
  });

  it('prefers the verified onboarding identity over an existing web session when creating the tenant', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'session-user-1',
      email: 'session@example.com',
      name: 'Session User',
      tenantId: 'tenant-session',
    });
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-google-1',
      email: 'verified@holded.com',
      name: 'Verified Holded User',
      tenantId: null,
      authMethod: 'google',
      emailVerified: true,
      firstName: 'Verified',
      lastName: 'Holded User',
      verifiedAt: '2026-04-07T09:30:00.000Z',
    });

    const response = await POST(
      new Request('https://app.verifactu.business/api/onboarding/tenant', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-holded-onboarding-token': 'onboarding-token-123',
        },
        body: JSON.stringify({
          name: 'Empresa Demo',
          legalName: 'Empresa Demo SL',
          taxId: 'B12345678',
          tradeName: 'Empresa Demo',
          extra: {
            representative: 'Verified Holded User',
            contactFirstName: 'Verified',
            contactLastName: 'Holded User',
            email: 'info@empresa-demo.es',
          },
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'holded-google-1',
        email: 'verified@holded.com',
        name: 'Verified Holded User',
      })
    );
  });
});
