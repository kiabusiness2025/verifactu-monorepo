/** @jest-environment node */

jest.mock('@/lib/integrations/channelIdentityStore', () => ({
  upsertChannelIdentity: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedOnboardingSession', () => ({
  resolveHoldedOnboardingSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    membership: {
      findFirst: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/session', () => ({
  getSessionPayload: jest.fn(),
}));

jest.mock('@/lib/oauth/mcp', () => ({
  resolveTenantForHoldedFirstSession: jest.fn(),
  resolveTenantForOAuthSession: jest.fn(),
}));

jest.mock('@/src/server/tenant/resolveActiveTenant', () => ({
  resolveActiveTenant: jest.fn(),
}));

import { upsertChannelIdentity } from '@/lib/integrations/channelIdentityStore';
import { resolveHoldedOnboardingSession } from '@/lib/integrations/holdedOnboardingSession';
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { resolveTenantForHoldedFirstSession, resolveTenantForOAuthSession } from '@/lib/oauth/mcp';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { requireTenantContext } from './tenantAuth';

const prismaMock = prisma as unknown as {
  membership: { findFirst: jest.Mock };
  tenant: { findUnique: jest.Mock };
};

describe('requireTenantContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    (resolveActiveTenant as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-session',
      tenant: null,
      supportMode: false,
      supportSessionId: null,
    });
    (resolveTenantForHoldedFirstSession as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-from-token',
      resolvedUserId: 'internal-user-1',
    });
    (resolveTenantForOAuthSession as jest.Mock).mockResolvedValue({
      tenantId: 'tenant-session',
      resolvedUserId: null,
    });
    prismaMock.membership.findFirst.mockResolvedValue(null);
    prismaMock.tenant.findUnique.mockResolvedValue({ isDemo: false });
  });

  it('honors the onboarding token tenant hint even when a signed session already exists', async () => {
    const result = await requireTenantContext({
      channelType: 'chatgpt',
      onboardingToken: 'onboarding-token-123',
    });

    expect(resolveHoldedOnboardingSession).toHaveBeenCalledWith('onboarding-token-123');
    expect(resolveTenantForHoldedFirstSession).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'session-user-1',
        sessionTenantId: 'tenant-session',
        tenantIdHint: 'tenant-from-token',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-from-token',
        resolvedUserId: 'internal-user-1',
        session: expect.objectContaining({
          uid: 'session-user-1',
          tenantId: 'tenant-from-token',
        }),
      })
    );
    expect(upsertChannelIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-from-token',
        channelSubjectId: 'session-user-1',
      })
    );
  });

  it('prefers the oauth-resolved tenant for chatgpt when the current session points elsewhere', async () => {
    (resolveHoldedOnboardingSession as jest.Mock).mockResolvedValue(null);

    const result = await requireTenantContext({
      channelType: 'chatgpt',
    });

    expect(resolveTenantForHoldedFirstSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionTenantId: 'tenant-session',
        tenantIdHint: null,
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-from-token',
        resolvedUserId: 'internal-user-1',
        session: expect.objectContaining({
          tenantId: 'tenant-from-token',
        }),
      })
    );
    expect(upsertChannelIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-from-token',
      })
    );
  });
});
