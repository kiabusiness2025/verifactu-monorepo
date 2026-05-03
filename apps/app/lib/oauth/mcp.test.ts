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
  verifyHoldedOnboardingToken,
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
    expect(getAuthorizationServerIssuer()).toBe('https://holded.verifactu.business');
    expect(getPublicScopePreset()).toBe('holded_public_campaign_v1');
    expect(getSupportedScopes()).toEqual([...HOLDED_MCP_SUPPORTED_SCOPES]);
    expect(getAdvertisedScopes()).toEqual([...HOLDED_MCP_SUPPORTED_SCOPES]);
    expect(getDefaultScopes()).toEqual([...getHoldedMcpScopePreset('holded_public_campaign_v1')]);
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
