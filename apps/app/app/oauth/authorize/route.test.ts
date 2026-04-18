/** @jest-environment node */

jest.mock('@/lib/integrations/channelIdentityStore', () => ({
  upsertChannelIdentity: jest.fn(),
}));

jest.mock('@/lib/integrations/holdedOnboardingSession', () => ({
  getHoldedOnboardingTokenFromSearchParams: jest.fn((searchParams: URLSearchParams) =>
    searchParams.get('onboarding_token')
  ),
  resolveHoldedOnboardingSession: jest.fn(async () => null),
}));

jest.mock('@/lib/integrations/holdedConnectionResolver', () => ({
  hasSharedHoldedConnectionForTenant: jest.fn(),
}));

jest.mock('@/lib/session', () => ({
  getSessionPayload: jest.fn(),
}));

jest.mock('@/lib/oauth/mcp', () => ({
  buildLoginUrl: jest.fn((next: string, source?: string) => {
    const sourceParam = source ? `&source=${encodeURIComponent(source)}` : '';
    return `https://holded.verifactu.business/auth/holded?next=${encodeURIComponent(next)}${sourceParam}`;
  }),
  ensureScopesAllowed: jest.fn(() => true),
  getDefaultScopes: jest.fn(() => ['mcp.read', 'holded.invoices.read']),
  getMcpResourceUrl: jest.fn(() => 'https://app.verifactu.business/api/mcp/holded'),
  isValidPkceCodeChallenge: jest.fn(() => true),
  mapSessionToOAuthUser: jest.fn((input) => ({
    uid: input.uid,
    email: input.email,
    name: input.name,
    tenantId: input.tenantId,
  })),
  mintHoldedOnboardingToken: jest.fn(async () => 'onboarding-token-123'),
  mintAuthorizationCode: jest.fn(async () => 'code-123'),
  resolveTenantForHoldedFirstSession: jest.fn(async () => ({
    tenantId: 'tenant-1',
    resolvedUserId: 'user-db-1',
  })),
  validateRedirectUri: jest.fn(() => true),
  verifyHoldedOnboardingToken: jest.fn(async () => null),
}));

import { hasSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { upsertChannelIdentity } from '@/lib/integrations/channelIdentityStore';
import { resolveHoldedOnboardingSession } from '@/lib/integrations/holdedOnboardingSession';
import {
  mintAuthorizationCode,
  mintHoldedOnboardingToken,
  resolveTenantForHoldedFirstSession,
} from '@/lib/oauth/mcp';
import { getSessionPayload } from '@/lib/session';
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('oauth authorize holded flow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects unauthenticated users to holded login first with onboarding as next target', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read&state=abc123&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'
    );

    const response = await GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(location).toContain('/auth/holded');
    expect(location).toContain('source=holded_chat_requires_session');
    expect(location).toContain(encodeURIComponent('holded_login_confirmed=1'));
    expect(mintAuthorizationCode).not.toHaveBeenCalled();
  });

  it('mints a tenant-aware onboarding token after login marker when oauth starts with a tenant hint', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read&tenant_id=tenant-demo&holded_login_confirmed=1&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'
    );

    const response = await GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toContain(encodeURIComponent('tenant_id=tenant-demo'));
    expect(mintHoldedOnboardingToken).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-demo' })
    );
  });

  it('forces login panel for chatgpt client even when there is an existing session', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });

    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'
    );

    const response = await GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toContain('/auth/holded');
    expect(location).toContain('source=holded_chat_requires_session');
    expect(location).toContain(encodeURIComponent('holded_login_confirmed=1'));
    expect(mintAuthorizationCode).not.toHaveBeenCalled();
  });

  it('forces login panel when redirect_uri is ChatGPT even if client_id is custom', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });

    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=custom-client-id&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'
    );

    const response = await GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toContain('/auth/holded');
    expect(location).toContain('source=holded_chat_requires_session');
    expect(location).toContain(encodeURIComponent('holded_login_confirmed=1'));
    expect(mintAuthorizationCode).not.toHaveBeenCalled();
  });

  it('rejects malformed url-like client_id before onboarding redirection', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });

    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=https%3A%2F%2Fholded.verifactu.business%2Fonboarding%2Fholded&redirect_uri=https%3A%2F%2Fchatgpt.com%2Fconnector%2Foauth%2FCKsc4g2DDcon&scope=mcp.read%20holded.invoices.read&state=abc123&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'
    );

    const response = await GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toContain('https://chatgpt.com/connector/oauth/CKsc4g2DDcon');
    expect(location).toContain('error=invalid_client');
    expect(location).toContain('state=abc123');
    expect(mintAuthorizationCode).not.toHaveBeenCalled();
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
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read&holded_login_confirmed=1&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'
    );

    const response = await GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(location).toContain('/onboarding/holded');
    expect(location).toContain('channel=chatgpt');
    expect(location).not.toContain('onboarding_token=');
    expect(location).not.toContain('connection_confirmed=1');
  });

  it('preserves the selected tenant hint while redirecting back to onboarding', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });
    (hasSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read&tenant_id=tenant-demo&holded_login_confirmed=1&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'
    );

    const response = await GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(location).toContain('/onboarding/holded');
    expect(location).toContain('tenant_id=tenant-demo');
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
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read&holded_login_confirmed=1&connection_confirmed=1&state=abc123&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'
    );

    const response = await GET(request);
    const location = response.headers.get('location');

    expect(response.status).toBe(307);
    expect(response.headers.get('x-verifactu-request-id')).toBeTruthy();
    expect(mintAuthorizationCode).toHaveBeenCalled();
    expect(location).toBe('https://chat.openai.com/aip/oauth/callback?code=code-123&state=abc123');
  });

  it('passes the selected tenant hint into the final oauth tenant resolution', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });
    (hasSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue(true);

    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read&holded_login_confirmed=1&connection_confirmed=1&tenant_id=tenant-demo&state=abc123&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(resolveTenantForHoldedFirstSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantIdHint: 'tenant-demo',
      })
    );
  });

  it('uses the onboarding token tenant hint when a signed session is already open', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
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
    (hasSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue(true);

    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read&holded_login_confirmed=1&connection_confirmed=1&onboarding_token=onboarding-token-123&state=abc123&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(resolveTenantForHoldedFirstSession).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'holded-guest-1',
        tenantIdHint: 'tenant-from-token',
      })
    );
  });

  it('rejects authorization requests without PKCE parameters', async () => {
    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://chat.openai.com/aip/oauth/callback?error=invalid_request'
    );
    expect(mintAuthorizationCode).not.toHaveBeenCalled();
  });

  it('records chatgpt channel identity with clientId:uid format when issuing an authorization code', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: 'tenant-1',
    });
    (hasSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue(true);

    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read&holded_login_confirmed=1&connection_confirmed=1&state=abc123&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'
    );

    await GET(request);

    expect(upsertChannelIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        channelType: 'chatgpt',
        channelSubjectId: 'openai-chatgpt-test:user-1',
        userId: 'user-db-1',
        tenantId: 'tenant-1',
      })
    );
  });

  it('returns 400 JSON when tenant resolution yields no tenantId and code cannot be issued', async () => {
    (getSessionPayload as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'demo@example.com',
      name: 'Demo User',
      tenantId: null,
    });
    (resolveTenantForHoldedFirstSession as jest.Mock).mockResolvedValue({
      tenantId: null,
      resolvedUserId: null,
    });
    (hasSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue(false);
    // Real mapSessionToOAuthUser returns null when tenantId is null; mirror that behaviour
    const mcpMock = jest.requireMock('@/lib/oauth/mcp') as {
      mapSessionToOAuthUser: jest.Mock;
    };
    mcpMock.mapSessionToOAuthUser.mockReturnValueOnce(null);

    const request = new NextRequest(
      'https://app.verifactu.business/oauth/authorize?response_type=code&client_id=openai-chatgpt-test&redirect_uri=https%3A%2F%2Fchat.openai.com%2Faip%2Foauth%2Fcallback&scope=mcp.read%20holded.invoices.read&holded_login_confirmed=1&connection_confirmed=1&code_challenge=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&code_challenge_method=S256'
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('no_tenant_selected');
    expect(mintAuthorizationCode).not.toHaveBeenCalled();
  });
});
