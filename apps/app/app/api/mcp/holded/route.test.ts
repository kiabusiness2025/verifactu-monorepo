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
    {
      name: 'holded_create_accounting_account',
      title: 'Create accounting account in Holded',
      description: 'Create an accounting account.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      name: 'holded_create_daily_ledger_entry',
      title: 'Create daily ledger entry in Holded',
      description: 'Create a daily ledger entry.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
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
  getDefaultScopes: jest.fn(() => ['mcp.read', 'holded.invoices.read']),
  getAuthorizationEndpoint: jest.fn(() => 'https://app.verifactu.business/oauth/authorize'),
  getAuthorizationServerMetadataUrl: jest.fn(
    () => 'https://app.verifactu.business/.well-known/oauth-authorization-server'
  ),
  getMcpResourceUrl: jest.fn(() => 'https://app.verifactu.business/api/mcp/holded'),
  getRegistrationEndpoint: jest.fn(() => 'https://app.verifactu.business/oauth/register'),
  getSupportedScopes: jest.fn(() => ['mcp.read', 'holded.invoices.read']),
  getUserInfoEndpoint: jest.fn(() => 'https://app.verifactu.business/oauth/userinfo'),
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

describe('MCP Holded route discovery and auth', () => {
  beforeEach(() => {
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a public descriptor on unauthenticated GET', async () => {
    const response = await GET(
      new Request('https://app.verifactu.business/api/mcp/holded') as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(payload.name).toBe('Isaak for Holded');
    expect(payload.endpoint).toBe('/api/mcp/holded');
    expect(payload.tools).toHaveLength(1);
    expect(applyOpenAiCorsHeaders).toHaveBeenCalled();
  });

  it('returns 200 on unauthenticated initialize', async () => {
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

    expect(response.status).toBe(200);
    expect(payload.result.protocolVersion).toBe('2024-11-05');
    expect(payload.result.serverInfo.name).toBe('Isaak for Holded');
  });

  it('returns a public tools/list on unauthenticated requests', async () => {
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

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(payload.result.tools).toHaveLength(1);
  });

  it('includes accounting write tools in public tools/list when the accounting phase preset is active', async () => {
    const { getDefaultScopes } = jest.requireMock('@/lib/oauth/mcp') as {
      getDefaultScopes: jest.Mock;
    };
    getDefaultScopes.mockReturnValue([
      'mcp.read',
      'holded.invoices.read',
      'holded.accounts.read',
      'holded.accounts.write',
    ]);

    const response = await POST(
      new Request('https://app.verifactu.business/api/mcp/holded', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/list',
          params: {},
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      'holded_list_invoices',
      'holded_create_accounting_account',
      'holded_create_daily_ledger_entry',
    ]);
  });

  it('returns 401 with WWW-Authenticate on unauthenticated tools/call', async () => {
    const response = await POST(
      new Request('https://app.verifactu.business/api/mcp/holded', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'holded_list_invoices',
            arguments: {},
          },
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
