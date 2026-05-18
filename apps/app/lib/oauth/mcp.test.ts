/** @jest-environment node */

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/src/server/tenant/resolveActiveTenant', () => ({
  resolveActiveTenant: jest.fn(),
}));

jest.mock('@verifactu/utils', () => ({
  getAppUrl: jest.fn(() => 'https://app.verifactu.business'),
  getLandingUrl: jest.fn(() => 'https://verifactu.business'),
  signSessionToken: jest.fn(),
  verifySessionToken: jest.fn(),
}));

import {
  getAdvertisedScopes,
  getAuthorizationServerIssuer,
  getDefaultScopes,
  getPublicScopePreset,
  getProtectedResourceMetadata,
  getProtectedResourceMetadataUrl,
  getSupportedScopes,
  mintHoldedOnboardingToken,
  mintHoldedOnboardingTokenForSubject,
  mintRefreshToken,
  verifyHoldedOnboardingToken,
  verifyRefreshToken,
} from './mcp';
import {
  HOLDED_MCP_SUPPORTED_SCOPES,
  getHoldedMcpScopePreset,
} from '@/lib/integrations/holdedMcpScopes';
import { signSessionToken, verifySessionToken } from '@verifactu/utils';

describe('MCP OAuth metadata helpers', () => {
  const originalPublicPreset = process.env.MCP_PUBLIC_SCOPE_PRESET;
  const originalSessionSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-session-secret';
  });

  afterEach(() => {
    if (originalPublicPreset === undefined) {
      delete process.env.MCP_PUBLIC_SCOPE_PRESET;
    } else {
      process.env.MCP_PUBLIC_SCOPE_PRESET = originalPublicPreset;
    }

    if (originalSessionSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = originalSessionSecret;
    }
  });

  it('derives the protected resource metadata URL from the MCP resource path', () => {
    expect(getProtectedResourceMetadataUrl()).toBe(
      'https://holded.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded'
    );
  });

  it('announces the authorization server issuer in protected resource metadata', () => {
    // Histórico del default público:
    //  - 2026-05-07: openai_review_v2 (14 tools)
    //  - 2026-05-11: holded_full_read_v1 (revertido tras rejection)
    //  - 2026-05-15: openai_review_v2 (revert)
    //  - 2026-05-18 (mañana): claude_parity (29 tools) para resubmit OpenAI v2.
    //  - 2026-05-18 (tarde): openai_review_invoicing_v1 (10 tools) tras
    //    decisión de producto de estrechar a invoicing+contabilidad mínimo.
    // El manifest chatgpt-app-submission.json debe contener exactamente las
    // tools cubiertas por este preset — ver test
    // "keeps the public openai_review_invoicing_v1 preset aligned..." en
    // holdedMcpTools.test.ts.
    expect(getAuthorizationServerIssuer()).toBe('https://holded.verifactu.business');
    expect(getPublicScopePreset()).toBe('openai_review_invoicing_v1');
    expect(getSupportedScopes()).toEqual([...HOLDED_MCP_SUPPORTED_SCOPES]);
    expect(getAdvertisedScopes()).toEqual([...HOLDED_MCP_SUPPORTED_SCOPES]);
    expect(getDefaultScopes()).toEqual([...getHoldedMcpScopePreset('openai_review_invoicing_v1')]);
    expect(getProtectedResourceMetadata()).toEqual({
      resource: 'https://holded.verifactu.business/api/mcp/holded',
      authorization_servers: ['https://holded.verifactu.business'],
      bearer_methods_supported: ['header'],
      scopes_supported: [...HOLDED_MCP_SUPPORTED_SCOPES],
    });
  });

  it('can advertise the full preset when configured explicitly', () => {
    process.env.MCP_PUBLIC_SCOPE_PRESET = 'full';

    expect(getPublicScopePreset()).toBe('full');
    expect(getDefaultScopes()).toEqual([...HOLDED_MCP_SUPPORTED_SCOPES]);
    expect(getAdvertisedScopes()).toEqual([...HOLDED_MCP_SUPPORTED_SCOPES]);
    expect(getProtectedResourceMetadata()).toEqual({
      resource: 'https://holded.verifactu.business/api/mcp/holded',
      authorization_servers: ['https://holded.verifactu.business'],
      bearer_methods_supported: ['header'],
      scopes_supported: [...HOLDED_MCP_SUPPORTED_SCOPES],
    });
  });

  it('accepts the expanded public read preset when configured explicitly', () => {
    process.env.MCP_PUBLIC_SCOPE_PRESET = 'holded_full_read_v1';

    expect(getPublicScopePreset()).toBe('holded_full_read_v1');
    expect(getDefaultScopes()).toEqual([...getHoldedMcpScopePreset('holded_full_read_v1')]);
  });

  it('can advertise the accounting phase preset when configured explicitly', () => {
    process.env.MCP_PUBLIC_SCOPE_PRESET = 'holded_phase2_accounting';

    expect(getPublicScopePreset()).toBe('holded_phase2_accounting');
    expect(getDefaultScopes()).toEqual([...getHoldedMcpScopePreset('holded_phase2_accounting')]);
    expect(getAdvertisedScopes()).toEqual([...HOLDED_MCP_SUPPORTED_SCOPES]);
    expect(getProtectedResourceMetadata()).toEqual({
      resource: 'https://holded.verifactu.business/api/mcp/holded',
      authorization_servers: ['https://holded.verifactu.business'],
      bearer_methods_supported: ['header'],
      scopes_supported: [...HOLDED_MCP_SUPPORTED_SCOPES],
    });
  });

  it('mints onboarding tokens with explicit auth state and derived display name', async () => {
    (signSessionToken as jest.Mock).mockResolvedValue('signed-onboarding-token');

    const token = await mintHoldedOnboardingToken({
      seed: 'seed-123',
      email: 'guest@example.com',
      firstName: 'Ksenia',
      lastName: 'Ilicheva',
      authMethod: 'email',
      emailVerified: true,
      verifiedAt: '2026-04-06T10:00:00.000Z',
    });

    expect(token).toBe('signed-onboarding-token');
    expect(signSessionToken).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          type: 'mcp_holded_onboarding',
          email: 'guest@example.com',
          name: 'Ksenia Ilicheva',
          authMethod: 'email',
          emailVerified: true,
          firstName: 'Ksenia',
          lastName: 'Ilicheva',
          verifiedAt: '2026-04-06T10:00:00.000Z',
        }),
      })
    );
  });

  it('preserves onboarding auth metadata when minting a refreshed tenant-aware token', async () => {
    (signSessionToken as jest.Mock).mockResolvedValue('signed-onboarding-token-2');

    await mintHoldedOnboardingTokenForSubject({
      uid: 'holded-guest-1',
      email: 'guest@example.com',
      name: 'Connector Guest',
      tenantId: 'tenant-123',
      authMethod: 'google',
      emailVerified: true,
      firstName: 'Connector',
      lastName: 'Guest',
      verifiedAt: '2026-04-06T11:30:00.000Z',
    });

    expect(signSessionToken).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          uid: 'holded-guest-1',
          tenantId: 'tenant-123',
          authMethod: 'google',
          emailVerified: true,
          firstName: 'Connector',
          lastName: 'Guest',
          verifiedAt: '2026-04-06T11:30:00.000Z',
        }),
      })
    );
  });

  describe('mintRefreshToken / verifyRefreshToken', () => {
    it('round-trips a refresh token payload', async () => {
      (signSessionToken as jest.Mock).mockImplementation(
        async ({ payload }: { payload: Record<string, unknown> }) =>
          Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
      );
      (verifySessionToken as jest.Mock).mockImplementation(async (token: string) => {
        try {
          return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
        } catch {
          return null;
        }
      });

      const input = {
        clientId: 'openai-chatgpt-test',
        scope: 'mcp.read holded.invoices.read',
        resource: 'https://holded.verifactu.business/api/mcp/holded',
        uid: 'user-1',
        email: 'demo@example.com',
        name: 'Demo User',
        tenantId: 'tenant-1',
      };
      const token = await mintRefreshToken(input);
      expect(typeof token).toBe('string');

      const parsed = await verifyRefreshToken(token);
      expect(parsed).toMatchObject({ type: 'mcp_refresh_token', ...input });
    });

    it('returns null for a token with the wrong type', async () => {
      (verifySessionToken as jest.Mock).mockResolvedValue({ type: 'mcp_access_token', uid: 'u1' });
      const result = await verifyRefreshToken('some-token');
      expect(result).toBeNull();
    });

    it('returns null for an invalid token', async () => {
      (verifySessionToken as jest.Mock).mockResolvedValue(null);
      const result = await verifyRefreshToken('bad-token');
      expect(result).toBeNull();
    });
  });

  it('returns expanded onboarding payloads from verification', async () => {
    (verifySessionToken as jest.Mock).mockResolvedValue({
      type: 'mcp_holded_onboarding',
      uid: 'holded-guest-1',
      email: 'guest@example.com',
      name: 'Connector Guest',
      tenantId: 'tenant-123',
      authMethod: 'email',
      emailVerified: true,
      firstName: 'Connector',
      lastName: 'Guest',
      verifiedAt: '2026-04-06T11:30:00.000Z',
    });

    await expect(verifyHoldedOnboardingToken('token-123')).resolves.toEqual(
      expect.objectContaining({
        uid: 'holded-guest-1',
        authMethod: 'email',
        emailVerified: true,
        firstName: 'Connector',
        lastName: 'Guest',
      })
    );
  });
});
