/** @jest-environment node */

const redirectMock = jest.fn((target: string) => {
  throw new Error(`NEXT_REDIRECT:${target}`);
});

jest.mock('next/navigation', () => ({
  redirect: (target: string) => redirectMock(target),
}));

jest.mock('@/lib/session', () => ({
  getSessionPayload: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedOnboardingSession', () => ({
  getHoldedOnboardingTokenFromSearchParams: (searchParams: URLSearchParams) =>
    searchParams.get('onboarding_token'),
  resolveHoldedOnboardingSession: jest.fn(),
}));

jest.mock('@/lib/api/tenantAuth', () => ({
  requireTenantContext: jest.fn(),
}));

jest.mock('@/lib/oauth/mcp', () => ({
  mintHoldedOnboardingTokenForSubject: jest.fn(async () => 'generated-onboarding-token'),
}));

jest.mock('@/lib/integrations/holdedConnectionResolver', () => ({
  resolveSharedHoldedConnectionForTenant: jest.fn(async () => null),
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
    tenant: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@verifactu/utils', () => ({
  getAppUrl: jest.fn(() => 'https://app.verifactu.business'),
}));

jest.mock('./HoldedOnboardingClient', () => ({
  __esModule: true,
  default: function MockHoldedOnboardingClient() {
    return null;
  },
}));

import { requireTenantContext } from '@/lib/api/tenantAuth';
import { resolveHoldedOnboardingSession } from '@/lib/integrations/holdedOnboardingSession';
import { mintHoldedOnboardingTokenForSubject } from '@/lib/oauth/mcp';
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import HoldedOnboardingPage from './page';

const prismaMock = prisma as unknown as {
  user: { findFirst: jest.Mock };
  userPreference: { findUnique: jest.Mock };
  membership: { findMany: jest.Mock };
  tenant: { findUnique: jest.Mock };
};

describe('HoldedOnboardingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.userPreference.findUnique.mockResolvedValue(null);
    prismaMock.membership.findMany.mockResolvedValue([]);
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 'tenant-auth',
      nif: 'B12345678',
      isDemo: false,
      name: 'Empresa Demo',
      legalName: 'Empresa Demo SL',
      profile: {
        tradeName: 'Empresa Demo',
        legalName: 'Empresa Demo SL',
        representative: 'Demo User',
        email: 'empresa@example.com',
        phone: '+34 600 000 000',
      },
    });
  });

  it('preserves onboarding_token and tenant_id when redirecting unauthenticated users to login', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue(null);
    (resolveHoldedOnboardingSession as jest.Mock).mockResolvedValue(null);

    await expect(
      HoldedOnboardingPage({
        searchParams: Promise.resolve({
          next: 'https://app.verifactu.business/oauth/authorize?client_id=openai-test',
          channel: 'chatgpt',
          require_connection_confirmation: '1',
          onboarding_token: 'onboarding-token-123',
          tenant_id: 'tenant-demo',
        }),
      })
    ).rejects.toThrow('NEXT_REDIRECT:');

    const loginUrl = new URL(redirectMock.mock.calls[0][0]);
    const nextUrl = new URL(loginUrl.searchParams.get('next') || 'https://app.verifactu.business');

    expect(loginUrl.pathname).toBe('/login');
    expect(nextUrl.pathname).toBe('/onboarding/holded');
    expect(nextUrl.searchParams.get('onboarding_token')).toBe('onboarding-token-123');
    expect(nextUrl.searchParams.get('tenant_id')).toBe('tenant-demo');
  });

  it('passes tenant hints into tenant resolution and the client props', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'session-user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-session',
    });
    (resolveHoldedOnboardingSession as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'guest@example.com',
      name: 'Guest User',
      tenantId: 'tenant-from-token',
    });
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-auth',
      session: {
        uid: 'session-user-1',
        email: 'demo@example.com',
        name: 'Demo User',
      },
    });

    const element = await HoldedOnboardingPage({
      searchParams: Promise.resolve({
        next: 'https://app.verifactu.business/oauth/authorize?response_type=code',
        channel: 'chatgpt',
        onboarding_token: 'onboarding-token-123',
        tenant_id: 'tenant-demo',
      }),
    });

    expect(requireTenantContext).toHaveBeenCalledWith(
      expect.objectContaining({
        channelType: 'chatgpt',
        onboardingToken: 'onboarding-token-123',
        tenantIdHint: 'tenant-demo',
      })
    );
    expect(element.props.tenantIdHint).toBe('tenant-auth');
    expect(element.props.requiresVerifiedIdentity).toBe(true);
    expect(element.props.identity).toEqual(
      expect.objectContaining({
        authMethod: 'unknown',
        email: 'guest@example.com',
        emailVerified: false,
      })
    );
  });

  it('keeps the contact first name blank when only the verified email is known', async () => {
    prismaMock.tenant.findUnique.mockResolvedValueOnce({
      id: 'tenant-auth',
      nif: 'B12345678',
      isDemo: false,
      name: 'Empresa Demo',
      legalName: 'Empresa Demo SL',
      profile: {
        tradeName: 'Empresa Demo',
        legalName: 'Empresa Demo SL',
        representative: null,
        email: 'empresa@example.com',
        phone: '+34 600 000 000',
      },
    });
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'session-user-1',
      email: 'kiabusiness2025@gmail.com',
      name: null,
      tenantId: 'tenant-session',
    });
    (resolveHoldedOnboardingSession as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'kiabusiness2025@gmail.com',
      name: 'Connector user',
      tenantId: 'tenant-from-token',
      authMethod: 'google',
      firstName: null,
      lastName: null,
    });
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-auth',
      session: {
        uid: 'session-user-1',
        email: 'kiabusiness2025@gmail.com',
        name: null,
      },
    });

    const element = await HoldedOnboardingPage({
      searchParams: Promise.resolve({
        next: 'https://app.verifactu.business/oauth/authorize?response_type=code',
        channel: 'chatgpt',
        onboarding_token: 'onboarding-token-123',
      }),
    });

    expect(element.props.summary.contactFirstName).toBe('');
    expect(element.props.summary.contactEmail).toBe('kiabusiness2025@gmail.com');
  });

  it('prefills company and tenant hint from a verified onboarding email when there is no active web session', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue(null);
    (resolveHoldedOnboardingSession as jest.Mock).mockResolvedValue({
      uid: 'holded-guest-1',
      email: 'owner@example.com',
      name: 'Owner User',
      tenantId: null,
      authMethod: 'email',
      emailVerified: true,
      firstName: 'Owner',
      lastName: 'User',
      verifiedAt: '2026-04-07T19:10:00.000Z',
    });
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'internal-user-1',
      name: 'Owner User',
      email: 'owner@example.com',
    });
    prismaMock.userPreference.findUnique.mockResolvedValue({ preferredTenantId: 'tenant-owned' });
    prismaMock.membership.findMany.mockResolvedValue([
      {
        tenantId: 'tenant-owned',
        tenant: {
          id: 'tenant-owned',
          nif: 'B12345678',
          isDemo: false,
          name: 'Empresa Demo',
          legalName: 'Empresa Demo SL',
          profile: {
            tradeName: 'Empresa Demo',
            legalName: 'Empresa Demo SL',
            representative: 'Owner User',
            representativeRole: 'owner',
            email: 'empresa@example.com',
            phone: '+34 600 000 000',
            website: 'https://empresa-demo.es',
            cnae: 'M - Actividades profesionales',
            cnaeCode: 'M',
            cnaeText: 'Actividades profesionales',
            address: 'Calle Mayor 1',
            postalCode: '28001',
            city: 'Madrid',
            province: 'Madrid',
            country: 'Espana',
          },
        },
      },
    ]);

    const element = await HoldedOnboardingPage({
      searchParams: Promise.resolve({
        next: 'https://app.verifactu.business/oauth/authorize?response_type=code',
        channel: 'chatgpt',
        onboarding_token: 'onboarding-token-123',
      }),
    });

    expect(requireTenantContext).not.toHaveBeenCalled();
    expect(element.props.tenantIdHint).toBe('tenant-owned');
    expect(element.props.summary.companyName).toBe('Empresa Demo');
    expect(element.props.summary.companyTaxId).toBe('B12345678');
    expect(element.props.summary.contactEmail).toBe('owner@example.com');
    expect(element.props.summary.contactFirstName).toBe('Owner');
  });

  it('mints a temporary onboarding token when chatgpt onboarding starts from an existing session without one', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'session-user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-session',
    });
    (resolveHoldedOnboardingSession as jest.Mock).mockResolvedValue(null);
    (requireTenantContext as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-auth',
      session: {
        uid: 'session-user-1',
        email: 'demo@example.com',
        name: 'Demo User',
      },
    });

    const element = await HoldedOnboardingPage({
      searchParams: Promise.resolve({
        next: 'https://app.verifactu.business/oauth/authorize?response_type=code',
        channel: 'chatgpt',
      }),
    });

    expect(mintHoldedOnboardingTokenForSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'session-user-1',
        email: 'demo@example.com',
        authMethod: 'unknown',
        emailVerified: false,
      })
    );
    expect(requireTenantContext).toHaveBeenCalledWith(
      expect.objectContaining({
        onboardingToken: 'generated-onboarding-token',
      })
    );
    expect(element.props.onboardingToken).toBe('generated-onboarding-token');
    expect(element.props.identity).toEqual(
      expect.objectContaining({
        authMethod: 'unknown',
        email: 'demo@example.com',
        emailVerified: false,
      })
    );
  });
});
