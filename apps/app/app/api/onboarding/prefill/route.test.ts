/** @jest-environment node */

jest.mock('@/lib/integrations/accounting', () => ({
  maskSecret: jest.fn((value: string) => `****${value.slice(-4)}`),
}));

jest.mock('@/lib/integrations/holdedOnboardingSession', () => ({
  isVerifiedHoldedOnboardingIdentity: jest.fn(
    (session: { email?: string | null; emailVerified?: boolean }) =>
      Boolean(session?.email && session?.emailVerified)
  ),
  resolveHoldedOnboardingSession: jest.fn(),
  resolveHoldedOnboardingSessionFromHeaders: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedVerifiedEmailIdentities', () => ({
  readVerifiedHoldedEmailIdentity: jest.fn(async () => null),
}));

jest.mock('@/lib/integrations/holdedConnectionResolver', () => ({
  resolveSharedHoldedConnectionForTenant: jest.fn(async () => null),
}));

jest.mock('@/lib/oauth/mcp', () => ({
  mintHoldedOnboardingTokenForSubject: jest.fn(async () => 'refreshed-onboarding-token'),
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
    einformaLastSyncAt: true,
    einformaTaxIdVerified: true,
    einformaRaw: true,
    employees: true,
    sales: true,
    salesYear: true,
    lastBalanceDate: true,
  })),
  buildTenantProfileOnboardingSelect: jest.fn(() => ({
    tradeName: true,
    legalName: true,
    representative: true,
    representativeRole: true,
    email: true,
    phone: true,
    website: true,
    cnae: true,
    cnaeCode: true,
    cnaeText: true,
    address: true,
    fiscalAddress: true,
    postalCode: true,
    city: true,
    province: true,
    country: true,
  })),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: jest.fn(),
    },
    userPreference: {
      findUnique: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
    },
  },
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import prisma from '@/lib/prisma';
import {
  resolveHoldedOnboardingSession,
  resolveHoldedOnboardingSessionFromHeaders,
} from '@/lib/integrations/holdedOnboardingSession';
import { readVerifiedHoldedEmailIdentity } from '@/lib/integrations/holdedVerifiedEmailIdentities';
import { resolveSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { mintHoldedOnboardingTokenForSubject } from '@/lib/oauth/mcp';

const prismaMock = prisma as unknown as {
  user: { findFirst: jest.Mock };
  userPreference: { findUnique: jest.Mock };
  membership: { findMany: jest.Mock };
};

function createRequest(body?: Record<string, unknown>) {
  return new NextRequest('https://app.verifactu.business/api/onboarding/prefill', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-holded-onboarding-token': 'onboarding-token-123',
    },
    body: JSON.stringify(body ?? {}),
  });
}

describe('POST /api/onboarding/prefill', () => {
  beforeEach(() => {
    (resolveHoldedOnboardingSessionFromHeaders as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'verified@example.com',
      name: 'Ksenia Ivanova Lopez',
      tenantId: null,
      authMethod: 'email',
      emailVerified: true,
      firstName: 'Ksenia',
      lastName: 'Ivanova Lopez',
      verifiedAt: '2026-04-09T09:15:00.000Z',
    });
    (resolveHoldedOnboardingSession as jest.Mock).mockResolvedValue(null);
    (readVerifiedHoldedEmailIdentity as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'verified@example.com',
      authMethod: 'email',
      verifiedAt: '2026-04-09T09:15:00.000Z',
      firstName: 'Ksenia',
      lastName: 'Ivanova Lopez',
      fullName: 'Ksenia Ivanova Lopez',
      tenantId: 'tenant-remembered',
      prefill: {
        companyName: 'Empresa Demo',
        companyLegalName: 'Empresa Demo SL',
        companyTaxId: 'B12345678',
        companyAddress: 'Calle Mayor 1',
        companyPostalCode: '28001',
        companyCity: 'Madrid',
        companyProvince: 'Madrid',
        companyCountry: 'Espana',
        companyWebsite: 'https://empresa-demo.es',
        companySectorCode: 'M',
        companySectorLabel: 'Actividades profesionales, cientificas y tecnicas',
        contactFirstName: 'Ksenia',
        contactLastName: 'Ivanova Lopez',
        contactRole: 'owner',
        contactFullName: 'Ksenia Ivanova Lopez',
        contactEmail: 'ksenia@example.com',
        companyEmail: 'info@empresa-demo.es',
        contactPhone: '+34 600 111 222',
      },
    });
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.userPreference.findUnique.mockResolvedValue(null);
    prismaMock.membership.findMany.mockResolvedValue([]);
    (resolveSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns remembered prefill directly when there is no resolved user yet', async () => {
    const response = await POST(createRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      summary: {
        companyName: 'Empresa Demo',
        companyLegalName: 'Empresa Demo SL',
        companyTaxId: 'B12345678',
        companyAddress: 'Calle Mayor 1',
        companyPostalCode: '28001',
        companyCity: 'Madrid',
        companyProvince: 'Madrid',
        companyCountry: 'Espana',
        companyWebsite: 'https://empresa-demo.es',
        companySectorCode: 'M',
        companySectorLabel: 'Actividades profesionales, cientificas y tecnicas',
        contactFirstName: 'Ksenia',
        contactRole: 'owner',
        contactFullName: 'Ksenia Ivanova Lopez',
        contactEmail: 'ksenia@example.com',
        companyEmail: 'info@empresa-demo.es',
        contactPhone: '+34 600 111 222',
      },
      tenantIdHint: null,
      savedPrefill: null,
    });
    expect(prismaMock.userPreference.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.membership.findMany).not.toHaveBeenCalled();
  });

  it('merges remembered prefill with the selected tenant summary and refreshes the token', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      name: 'Legacy User Name',
      email: 'verified@example.com',
    });
    prismaMock.userPreference.findUnique.mockResolvedValue({ preferredTenantId: 'tenant-1' });
    prismaMock.membership.findMany.mockResolvedValue([
      {
        tenantId: 'tenant-1',
        tenant: {
          id: 'tenant-1',
          nif: null,
          isDemo: false,
          name: 'Empresa Tenant',
          legalName: null,
          profile: {
            tradeName: 'Empresa Tenant',
            legalName: null,
            representative: null,
            representativeRole: null,
            email: null,
            phone: null,
            website: null,
            cnae: null,
            cnaeCode: null,
            cnaeText: null,
            address: 'Calle Tenant 42',
            fiscalAddress: null,
            postalCode: null,
            city: 'Madrid',
            province: 'Madrid',
            country: null,
          },
        },
      },
    ]);

    const response = await POST(createRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.tenantIdHint).toBe('tenant-1');
    expect(payload.onboardingToken).toBe('refreshed-onboarding-token');
    expect(payload.savedPrefill).toBeNull();
    expect(payload.summary).toEqual({
      companyName: 'Empresa Tenant',
      companyLegalName: 'Empresa Demo SL',
      companyTaxId: 'B12345678',
      companyAddress: 'Calle Tenant 42',
      companyPostalCode: '28001',
      companyCity: 'Madrid',
      companyProvince: 'Madrid',
      companyCountry: 'Espana',
      companyWebsite: 'https://empresa-demo.es',
      companySectorCode: 'M',
      companySectorLabel: 'Actividades profesionales, cientificas y tecnicas',
      contactFirstName: 'Ksenia',
      contactRole: 'owner',
      contactFullName: 'Ksenia Ivanova Lopez',
      contactEmail: 'verified@example.com',
      companyEmail: 'info@empresa-demo.es',
      contactPhone: '+34 600 111 222',
    });
    expect(resolveSharedHoldedConnectionForTenant).toHaveBeenCalledWith('tenant-1', 'chatgpt');
    expect(mintHoldedOnboardingTokenForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'holded-guest-1',
        email: 'verified@example.com',
        tenantId: 'tenant-1',
        tenantBound: true,
      })
    );
  });
});
