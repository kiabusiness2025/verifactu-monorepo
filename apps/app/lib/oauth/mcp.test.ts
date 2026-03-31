/** @jest-environment node */

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/lib/integrations/holdedMcpScopes', () => ({
  HOLDED_MCP_SUPPORTED_SCOPES: ['mcp.read', 'holded.invoices.read', 'holded.accounts.read'],
  HOLDED_MCP_TOOL_SCOPES: {},
  getHoldedMcpScopePreset: jest.fn(() => ['mcp.read']),
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
  getAuthorizationServerIssuer,
  getProtectedResourceMetadata,
  getProtectedResourceMetadataUrl,
} from './mcp';

describe('MCP OAuth metadata helpers', () => {
  it('derives the protected resource metadata URL from the MCP resource path', () => {
    expect(getProtectedResourceMetadataUrl()).toBe(
      'https://app.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded'
    );
  });

  it('announces the authorization server issuer in protected resource metadata', () => {
    expect(getAuthorizationServerIssuer()).toBe('https://app.verifactu.business');
    expect(getProtectedResourceMetadata()).toEqual({
      resource: 'https://app.verifactu.business/api/mcp/holded',
      authorization_servers: ['https://app.verifactu.business'],
      bearer_methods_supported: ['header'],
      scopes_supported: ['mcp.read', 'holded.invoices.read', 'holded.accounts.read'],
    });
  });
});
