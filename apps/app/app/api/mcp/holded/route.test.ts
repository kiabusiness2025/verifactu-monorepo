/** @jest-environment node */

jest.mock('@/lib/integrations/holdedMcpTools', () => ({
  callHoldedMcpTool: jest.fn(),
  holdedMcpTools: [
    {
      name: 'holded_list_invoices',
      title: 'List invoices in Holded',
      description: 'List invoices.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
  ],
}));

jest.mock('@/lib/integrations/holdedConnectionResolver', () => ({
  resolveSharedHoldedConnectionForTenant: jest.fn(),
}));

jest.mock('@/lib/session', () => ({
  getSessionPayload: jest.fn(),
}));

jest.mock('@/src/server/tenant/resolveActiveTenant', () => ({
  resolveActiveTenant: jest.fn(),
}));

jest.mock('@/lib/oauth/mcp', () => ({
  applyOpenAiCorsHeaders: jest.fn((response, request) => {
    const origin = request.headers.get('origin');
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    return response;
  }),
  getDefaultScopes: jest.fn(() => ['mcp.read']),
  getAuthorizationEndpoint: jest.fn(() => 'https://app.verifactu.business/oauth/authorize'),
  getAuthorizationServerMetadataUrl: jest.fn(
    () => 'https://app.verifactu.business/.well-known/oauth-authorization-server'
  ),
  getMcpResourceUrl: jest.fn(() => 'https://app.verifactu.business/api/mcp/holded'),
  getSupportedScopes: jest.fn(() => ['mcp.read']),
  hasRequiredScopes: jest.fn(() => true),
  MCP_TOOL_SCOPES: {},
  getProtectedResourceMetadataUrl: jest.fn(
    () => 'https://app.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded'
  ),
  getTokenEndpoint: jest.fn(() => 'https://app.verifactu.business/oauth/token'),
  verifyAccessToken: jest.fn(async () => null),
}));

import { GET, POST } from './route';
import { applyOpenAiCorsHeaders, verifyAccessToken } from '@/lib/oauth/mcp';

describe('MCP Holded route auth challenge', () => {
  beforeEach(() => {
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 with WWW-Authenticate on unauthenticated GET', async () => {
    const response = await GET(
      new Request('https://app.verifactu.business/api/mcp/holded') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: 'Unauthorized MCP access' });
    expect(response.headers.get('WWW-Authenticate')).toContain('resource_metadata=');
    expect(response.headers.get('WWW-Authenticate')).toContain(
      'https://app.verifactu.business/.well-known/oauth-protected-resource/api/mcp/holded'
    );
    expect(response.headers.get('WWW-Authenticate')).toContain('authorization_uri=');
    expect(applyOpenAiCorsHeaders).toHaveBeenCalled();
  });

  it('returns 401 with WWW-Authenticate on unauthenticated initialize', async () => {
    const response = await POST(
      new Request('https://app.verifactu.business/api/mcp/holded', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' },
          },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: 'Unauthorized MCP access' });
    expect(response.headers.get('WWW-Authenticate')).toContain('resource_metadata=');
  });

  it('returns 401 with WWW-Authenticate on unauthenticated tools/list', async () => {
    const response = await POST(
      new Request('https://app.verifactu.business/api/mcp/holded', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {},
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: 'Unauthorized MCP access' });
    expect(response.headers.get('WWW-Authenticate')).toContain('resource_metadata=');
  });

  it('returns CORS headers on authenticated tools/list', async () => {
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      tenantId: 'tenant_123',
      uid: 'user_123',
      email: 'user@example.com',
      scope: 'mcp.read holded.invoices.read',
    });

    const response = await POST(
      new Request('https://app.verifactu.business/api/mcp/holded', {
        method: 'POST',
        headers: {
          origin: 'https://chatgpt.com',
          authorization: 'Bearer oauth-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/list',
          params: {},
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://chatgpt.com');
    expect(payload.result.tools).toHaveLength(1);
    expect(applyOpenAiCorsHeaders).toHaveBeenCalled();
  });
});
