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

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
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
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import HoldedOnboardingPage from './page';

const prismaMock = prisma as unknown as {
  tenant: { findUnique: jest.Mock };
};

describe('HoldedOnboardingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });
});
