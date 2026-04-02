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
} from './mcp';
import {
  HOLDED_MCP_SUPPORTED_SCOPES,
  getHoldedMcpScopePreset,
} from '@/lib/integrations/holdedMcpScopes';

describe('MCP OAuth metadata helpers', () => {
  const originalPublicPreset = process.env.MCP_PUBLIC_SCOPE_PRESET;

  afterEach(() => {
    if (originalPublicPreset === undefined) {
      delete process.env.MCP_PUBLIC_SCOPE_PRESET;
    } else {
      process.env.MCP_PUBLIC_SCOPE_PRESET = originalPublicPreset;
    }
  });

  it('derives the protected resource metadata URL from the MCP resource path', () => {
    expect(getProtectedResourceMetadataUrl()).toBe(
      'https://app.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded'
    );
  });

  it('announces the authorization server issuer in protected resource metadata', () => {
    expect(getAuthorizationServerIssuer()).toBe('https://app.verifactu.business');
    expect(getPublicScopePreset()).toBe('openai_review_v2');
    expect(getSupportedScopes()).toEqual([...HOLDED_MCP_SUPPORTED_SCOPES]);
    expect(getAdvertisedScopes()).toEqual([...HOLDED_MCP_SUPPORTED_SCOPES]);
    expect(getDefaultScopes()).toEqual([...getHoldedMcpScopePreset('openai_review_v2')]);
    expect(getProtectedResourceMetadata()).toEqual({
      resource: 'https://app.verifactu.business/api/mcp/holded',
      authorization_servers: ['https://app.verifactu.business'],
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
      resource: 'https://app.verifactu.business/api/mcp/holded',
      authorization_servers: ['https://app.verifactu.business'],
      bearer_methods_supported: ['header'],
      scopes_supported: [...HOLDED_MCP_SUPPORTED_SCOPES],
    });
  });
});
