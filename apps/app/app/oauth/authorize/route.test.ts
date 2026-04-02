/** @jest-environment node */

jest.mock('@/lib/integrations/channelIdentityStore', () => ({
  upsertChannelIdentity: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedConnectionResolver', () => ({
  hasSharedHoldedConnectionForTenant: jest.fn(),
}));

jest.mock('@/lib/session', () => ({
  getSessionPayload: jest.fn(),
}));

jest.mock('@/lib/oauth/mcp', () => ({
  buildLoginUrl: jest.fn(
    (next: string) =>
      `https://holded.verifactu.business/auth/holded?next=${encodeURIComponent(next)}`
  ),
  ensureScopesAllowed: jest.fn(() => true),
  getDefaultScopes: jest.fn(() => ['mcp.read', 'holded.invoices.read']),
  getMcpResourceUrl: jest.fn(() => 'https://app.verifactu.business/api/mcp/holded'),
  mapSessionToOAuthUser: jest.fn((input) => ({
    uid: input.uid,
    email: input.email,
    name: input.name,
    tenantId: input.tenantId,
  })),
  mintAuthorizationCode: jest.fn(async () => 'code-123'),
  mintHoldedOnboardingToken: jest.fn(async () => 'onboarding-token-123'),
  resolveTenantForHoldedFirstSession: jest.fn(async () => ({
    tenantId: 'tenant-1',
    resolvedUserId: 'user-db-1',
  })),
  validateRedirectUri: jest.fn(() => true),
  verifyHoldedOnboardingToken: jest.fn(async () => null),
}));

import { NextRequest } from 'next/server';
import { GET } from './route';
import { hasSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { getSessionPayload } from '@/lib/session';
import { mintAuthorizationCode } from '@/lib/oauth/mcp';

describe('oauth authorize holded flow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to onboarding even when a chatgpt connection already exists until the user confirms reconnection', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });
    (hasSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue(true);

    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read'
    );

    const response = await GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toContain('/onboarding/holded');
    expect(location).toContain('require_connection_confirmation=1');
    expect(location).toContain('onboarding_token=onboarding-token-123');
    expect(location).not.toContain('connection_confirmed=1');
  });

  it('issues an authorization code after the connection form confirms reconnection', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });
    (hasSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue(true);

    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read&onboarding_token=onboarding-token-123&connection_confirmed=1&state=abc123'
    );

    const response = await GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(mintAuthorizationCode).toHaveBeenCalled();
    expect(location).toBe('https://chat.openai.com/aip/oauth/callback?code=code-123&state=abc123');
  });
});
