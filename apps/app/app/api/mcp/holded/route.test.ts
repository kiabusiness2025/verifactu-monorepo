/** @jest-environment node */

jest.mock('@/lib/integrations/holdedMcpTools', () => ({
  callHoldedMcpTool: jest.fn(),
  HoldedUserError: class HoldedUserError extends Error {
    code: string;
    data: Record<string, unknown>;
    constructor(code: string, message: string, data: Record<string, unknown> = {}) {
      super(message);
      this.name = 'HoldedUserError';
      this.code = code;
      this.data = data;
    }
  },
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
      name: 'holded_list_purchases',
      title: 'List purchase invoices in Holded',
      description: 'List purchase invoices.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      name: 'holded_list_expense_invoices',
      title: 'List expense invoices in Holded',
      description: 'List expense invoices.',
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

jest.mock('@/lib/integrations/accountingStore', () => ({
  markAccountingIntegrationRevoked: jest.fn(),
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
  getPublicScopePreset: jest.fn(() => 'holded_full_read_v1'),
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
import { applyOpenAiCorsHeaders, verifyAccessToken, hasRequiredScopes } from '@/lib/oauth/mcp';
import { resolveSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { callHoldedMcpTool, HoldedUserError } from '@/lib/integrations/holdedMcpTools';
import { markAccountingIntegrationRevoked } from '@/lib/integrations/accountingStore';

describe('MCP Holded route discovery and auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    // Reset hasRequiredScopes to default allow behavior
    (
      jest.requireMock('@/lib/oauth/mcp') as { hasRequiredScopes: jest.Mock }
    ).hasRequiredScopes.mockReturnValue(true);
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
    expect(payload.name).toBe('Holded Connector for ChatGPT');
    expect(payload.description).toContain('public campaign default');
    expect(payload.description).toContain('bounded daily ledger reads');
    expect(payload.description).not.toContain('purchase summaries');
    expect(payload.endpoint).toBe('/api/mcp/holded');
    expect(payload.tools.map((tool: { name: string }) => tool.name)).toEqual([
      'holded_list_invoices',
    ]);
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
    expect(payload.result.serverInfo.name).toBe('Holded Connector for ChatGPT');
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
    expect(payload.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      'holded_list_invoices',
    ]);
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
      scope: 'mcp.read holded.invoices.read holded.contacts.read holded.accounts.read',
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
    expect(payload.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      'holded_list_invoices',
    ]);
    expect(applyOpenAiCorsHeaders).toHaveBeenCalled();
  });

  it('executes a tools/call and returns structured result when OAuth token and connection are valid', async () => {
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      tenantId: 'tenant_123',
      uid: 'user_123',
      email: 'user@example.com',
      scope: 'mcp.read holded.invoices.read',
    });
    (resolveSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue({
      apiKey: 'holded-api-key-abc',
      source: 'external_connection',
    });
    (callHoldedMcpTool as jest.Mock).mockResolvedValue({
      invoices: [{ id: 'inv-1', total: 100 }],
    });

    const response = await POST(
      new Request('https://app.verifactu.business/api/mcp/holded', {
        method: 'POST',
        headers: {
          authorization: 'Bearer oauth-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/call',
          params: { name: 'holded_list_invoices', arguments: {} },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.result.content[0].type).toBe('text');
    expect(JSON.parse(payload.result.content[0].text)).toMatchObject({
      source: 'external_connection',
      invoices: [{ id: 'inv-1', total: 100 }],
    });
    expect(callHoldedMcpTool).toHaveBeenCalledWith(
      'holded-api-key-abc',
      'holded_list_invoices',
      {}
    );
  });

  it('executes tools/call with the internal shared secret using the full supported scope set', async () => {
    const oldSecret = process.env.MCP_SHARED_SECRET;
    const oldTestKey = process.env.HOLDED_TEST_API_KEY;
    process.env.MCP_SHARED_SECRET = 'local-test-secret';
    process.env.HOLDED_TEST_API_KEY = 'local-holded-test-key';

    try {
      const mcpMock = jest.requireMock('@/lib/oauth/mcp') as {
        MCP_TOOL_SCOPES: Record<string, string[]>;
        hasRequiredScopes: jest.Mock;
      };
      mcpMock.MCP_TOOL_SCOPES = { holded_list_invoices: ['mcp.read', 'holded.invoices.read'] };
      mcpMock.hasRequiredScopes.mockReturnValueOnce(true);
      (callHoldedMcpTool as jest.Mock).mockResolvedValue({
        items: [{ id: 'inv-1', total: 100 }],
      });

      const response = await POST(
        new Request('https://app.verifactu.business/api/mcp/holded', {
          method: 'POST',
          headers: {
            authorization: 'Bearer local-test-secret',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 16,
            method: 'tools/call',
            params: { name: 'holded_list_invoices', arguments: {} },
          }),
        }) as never
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.error).toBeUndefined();
      expect(hasRequiredScopes).toHaveBeenCalledWith('mcp.read holded.invoices.read', [
        'mcp.read',
        'holded.invoices.read',
      ]);
      expect(callHoldedMcpTool).toHaveBeenCalledWith(
        'local-holded-test-key',
        'holded_list_invoices',
        {}
      );
    } finally {
      if (oldSecret === undefined) delete process.env.MCP_SHARED_SECRET;
      else process.env.MCP_SHARED_SECRET = oldSecret;
      if (oldTestKey === undefined) delete process.env.HOLDED_TEST_API_KEY;
      else process.env.HOLDED_TEST_API_KEY = oldTestKey;
    }
  });

  it('returns MCP error when OAuth token is valid but scope is missing for requested tool', async () => {
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      tenantId: 'tenant_123',
      uid: 'user_123',
      email: 'user@example.com',
      scope: 'mcp.read',
    });
    // Simulate scope check failing for this token's scope
    (hasRequiredScopes as jest.Mock).mockReturnValueOnce(false);
    // Make MCP_TOOL_SCOPES include the tool so the scope check is triggered
    const mcpMock = jest.requireMock('@/lib/oauth/mcp') as {
      MCP_TOOL_SCOPES: Record<string, string[]>;
    };
    mcpMock.MCP_TOOL_SCOPES = { holded_list_invoices: ['mcp.read', 'holded.invoices.read'] };

    const response = await POST(
      new Request('https://app.verifactu.business/api/mcp/holded', {
        method: 'POST',
        headers: {
          authorization: 'Bearer oauth-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/call',
          params: { name: 'holded_list_invoices', arguments: {} },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.error).toMatchObject({ code: -32000 });
    expect(payload.error.message).toContain('Internal MCP error');
    expect(callHoldedMcpTool).not.toHaveBeenCalled();
  });

  it('returns MCP error when OAuth token is valid but the tenant has no Holded connection', async () => {
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      tenantId: 'tenant_no_connection',
      uid: 'user_456',
      email: 'user@example.com',
      scope: 'mcp.read holded.invoices.read',
    });
    (resolveSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue(null);

    const response = await POST(
      new Request('https://app.verifactu.business/api/mcp/holded', {
        method: 'POST',
        headers: {
          authorization: 'Bearer oauth-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 12,
          method: 'tools/call',
          params: { name: 'holded_list_invoices', arguments: {} },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.error).toMatchObject({ code: -32000 });
    expect(payload.error.message).toContain('Internal MCP error');
    expect(callHoldedMcpTool).not.toHaveBeenCalled();
  });

  it('marks connection as revoked when Holded returns unauthorized during tools/call', async () => {
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      tenantId: 'tenant_123',
      uid: 'user_123',
      email: 'user@example.com',
      scope: 'mcp.read holded.invoices.read',
    });
    (resolveSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue({
      apiKey: 'holded-api-key-abc',
      source: 'external_connection',
    });
    (callHoldedMcpTool as jest.Mock).mockRejectedValue(
      new Error('Holded API request failed with status 401: Unauthorized')
    );

    const response = await POST(
      new Request('https://app.verifactu.business/api/mcp/holded', {
        method: 'POST',
        headers: {
          authorization: 'Bearer oauth-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 13,
          method: 'tools/call',
          params: { name: 'holded_list_invoices', arguments: {} },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.error).toMatchObject({ code: -32000 });
    expect(payload.error.message).toContain('Internal MCP error');
    expect(markAccountingIntegrationRevoked).toHaveBeenCalledWith(
      'tenant_123',
      'chatgpt',
      expect.stringContaining('status 401')
    );
  });

  it('returns a graceful tool result (no JSON-RPC error) when a handler throws HoldedUserError', async () => {
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      tenantId: 'tenant_123',
      uid: 'user_123',
      email: 'user@example.com',
      scope: 'mcp.read holded.invoices.read',
    });
    (resolveSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue({
      apiKey: 'holded-api-key-abc',
      source: 'external_connection',
    });
    (callHoldedMcpTool as jest.Mock).mockRejectedValue(
      new HoldedUserError(
        'confirmation_required',
        'Awaiting your confirmation. Nothing has been written to Holded yet.'
      )
    );

    const response = await POST(
      new Request('https://app.verifactu.business/api/mcp/holded', {
        method: 'POST',
        headers: {
          authorization: 'Bearer oauth-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 14,
          method: 'tools/call',
          params: { name: 'holded_create_accounting_account', arguments: {} },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.error).toBeUndefined();
    expect(payload.result.structuredContent).toMatchObject({
      error: 'confirmation_required',
      tool: 'holded_create_accounting_account',
    });
    expect(payload.result.content[0].text).toContain('Awaiting your confirmation');
    expect(markAccountingIntegrationRevoked).not.toHaveBeenCalled();
  });

  it('returns a graceful tool result (no revocation) when Holded responds 403 module forbidden', async () => {
    (verifyAccessToken as jest.Mock).mockResolvedValue({
      tenantId: 'tenant_123',
      uid: 'user_123',
      email: 'user@example.com',
      scope: 'mcp.read holded.invoices.read',
    });
    (resolveSharedHoldedConnectionForTenant as jest.Mock).mockResolvedValue({
      apiKey: 'holded-api-key-abc',
      source: 'external_connection',
    });
    const forbidden = Object.assign(
      new Error('Holded API request failed with status 403: Forbidden'),
      { status: 403 }
    );
    (callHoldedMcpTool as jest.Mock).mockRejectedValue(forbidden);

    const response = await POST(
      new Request('https://app.verifactu.business/api/mcp/holded', {
        method: 'POST',
        headers: {
          authorization: 'Bearer oauth-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 15,
          method: 'tools/call',
          params: { name: 'holded_list_invoices', arguments: {} },
        }),
      }) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.error).toBeUndefined();
    expect(payload.result.structuredContent).toMatchObject({
      error: 'holded_module_forbidden',
      status: 403,
    });
    expect(markAccountingIntegrationRevoked).not.toHaveBeenCalled();
  });
});
