import {
  callHoldedMcpTool,
  holdedMcpTools,
  type HoldedMcpToolDefinition,
} from '@/lib/integrations/holdedMcpTools';
import { getAllowedHoldedMcpToolNames } from '@/lib/integrations/holdedMcpScopes';
import {
  applyOpenAiCorsHeaders,
  getDefaultScopes,
  getAuthorizationEndpoint,
  getAuthorizationServerMetadataUrl,
  getMcpResourceUrl,
  getSupportedScopes,
  hasRequiredScopes,
  MCP_TOOL_SCOPES,
  getProtectedResourceMetadataUrl,
  getTokenEndpoint,
  verifyAccessToken,
} from '@/lib/oauth/mcp';
import { resolveSharedHoldedConnectionForTenant } from '@/lib/integrations/holdedConnectionResolver';
import { getSessionPayload } from '@/lib/session';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

type ToolDefinition = HoldedMcpToolDefinition;

const TOOLS: ToolDefinition[] = holdedMcpTools;

function getVisibleTools(scopes: string | readonly string[]) {
  const visibleToolNames = new Set(getAllowedHoldedMcpToolNames(scopes));
  return TOOLS.filter((tool) => visibleToolNames.has(tool.name));
}

function resolveVisibleTools(
  access?: {
    mode: 'oauth' | 'shared_secret';
    scope?: string | null;
  } | null
) {
  if (!access) {
    return getVisibleTools(getDefaultScopes());
  }

  if (access.mode === 'shared_secret') {
    return getVisibleTools(getSupportedScopes());
  }

  return getVisibleTools(access.scope ?? '');
}

function jsonRpc(
  id: JsonRpcRequest['id'],
  result?: unknown,
  error?: { code: number; message: string }
) {
  return NextResponse.json({
    jsonrpc: '2.0',
    id: id ?? null,
    ...(error ? { error } : { result }),
  });
}

function unauthorized(request: NextRequest) {
  return applyOpenAiCorsHeaders(
    NextResponse.json(
      {
        error: 'Unauthorized MCP access',
      },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': `Bearer resource_metadata="${getProtectedResourceMetadataUrl()}", authorization_uri="${getAuthorizationEndpoint()}", resource="${getMcpResourceUrl()}"`,
        },
      }
    ),
    request,
    {
      methods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['authorization', 'content-type'],
      exposeHeaders: ['WWW-Authenticate'],
    }
  );
}

async function assertMcpAccess(request: NextRequest) {
  const expected = process.env.MCP_SHARED_SECRET?.trim();

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;

  if (expected && token === expected) {
    return { mode: 'shared_secret' as const, tenantId: null };
  }

  const oauth = await verifyAccessToken(token);
  if (!oauth) return null;

  return {
    mode: 'oauth' as const,
    tenantId: oauth.tenantId,
    uid: oauth.uid,
    email: oauth.email,
    scope: oauth.scope,
  };
}

function logMcpAccess(event: {
  method: string;
  tool?: string;
  tenantId?: string | null;
  uid?: string | null;
  outcome: 'allowed' | 'denied' | 'error';
  reason?: string;
}) {
  console.info('[MCP Holded]', JSON.stringify({ ts: new Date().toISOString(), ...event }));
}

async function resolveHoldedApiKey(access?: {
  mode: 'oauth' | 'shared_secret';
  tenantId: string | null;
}) {
  if (access?.tenantId) {
    const connection = await resolveSharedHoldedConnectionForTenant(
      access.tenantId,
      access.mode === 'oauth' ? 'chatgpt' : 'dashboard'
    );
    if (connection) {
      return {
        apiKey: connection.apiKey,
        source: connection.source,
      };
    }
  }

  // Keep OAuth channel isolated from dashboard session state.
  // If the OAuth token does not resolve to a tenant with a Holded connection,
  // the caller must reconnect Holded for that tenant instead of falling back.
  if (access?.mode === 'oauth') {
    throw new Error('No Holded API key configured for this OAuth tenant');
  }

  const session = await getSessionPayload();

  if (session?.uid) {
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });

    if (resolved.tenantId) {
      const connection = await resolveSharedHoldedConnectionForTenant(
        resolved.tenantId,
        'dashboard'
      );
      if (connection) {
        return {
          apiKey: connection.apiKey,
          source: connection.source,
        };
      }
    }
  }

  const fallbackKey = process.env.HOLDED_TEST_API_KEY?.trim();
  const allowFallback = process.env.NODE_ENV !== 'production';
  if (fallbackKey && allowFallback) {
    return {
      apiKey: fallbackKey,
      source: 'env_test_key' as const,
    };
  }

  throw new Error('No Holded API key configured for MCP');
}

function formatToolResult(data: unknown) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent: data,
  };
}

async function callTool(
  access: {
    mode: 'oauth' | 'shared_secret';
    tenantId: string | null;
    scope?: string | null;
    uid?: string | null;
  },
  name: string,
  args: Record<string, unknown> | undefined
) {
  const requiredScopes = MCP_TOOL_SCOPES[name];
  if (requiredScopes && !hasRequiredScopes(access.scope ?? '', requiredScopes)) {
    logMcpAccess({
      method: 'tools/call',
      tool: name,
      tenantId: access.tenantId,
      uid: access.uid ?? null,
      outcome: 'denied',
      reason: 'missing_scope',
    });
    throw new Error(`Missing required scope for tool ${name}`);
  }

  const { apiKey, source } = await resolveHoldedApiKey({
    mode: access.mode,
    tenantId: access.tenantId,
  });
  const result = await callHoldedMcpTool(apiKey, name, args);

  logMcpAccess({
    method: 'tools/call',
    tool: name,
    tenantId: access.tenantId,
    uid: access.uid ?? null,
    outcome: 'allowed',
  });

  return formatToolResult({ source, ...result });
}

export async function OPTIONS(request: NextRequest) {
  return applyOpenAiCorsHeaders(
    new NextResponse(null, {
      status: 204,
      headers: {
        Allow: 'GET, POST, OPTIONS',
      },
    }),
    request,
    {
      methods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['authorization', 'content-type'],
      exposeHeaders: ['WWW-Authenticate'],
    }
  );
}

export async function GET(request: NextRequest) {
  const access = await assertMcpAccess(request);
  if (!access) {
    logMcpAccess({ method: 'GET', outcome: 'denied', reason: 'unauthorized' });
    return unauthorized(request);
  }

  const visibleTools = resolveVisibleTools(access);

  return applyOpenAiCorsHeaders(
    NextResponse.json({
      name: 'Isaak for Holded',
      description:
        'Public-ready MCP connector for Isaak and Holded. It lets authorized Verifactu users inspect and operate validated Holded invoicing modules such as documents, contacts, treasury, payments, products, services, warehouses, numbering series, contact groups, taxes, remittances, accounting accounts, CRM bookings, and project context for the connected tenant.',
      protocol: 'MCP over JSON-RPC HTTP',
      endpoint: '/api/mcp/holded',
      oauth: {
        authorizationEndpoint: getAuthorizationEndpoint(),
        tokenEndpoint: getTokenEndpoint(),
        authorizationServerMetadata: getAuthorizationServerMetadataUrl(),
        protectedResourceMetadata: getProtectedResourceMetadataUrl(),
        resource: getMcpResourceUrl(),
      },
      tools: visibleTools.map(({ name, title, description }) => ({ name, title, description })),
    }),
    request,
    {
      methods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['authorization', 'content-type'],
      exposeHeaders: ['WWW-Authenticate'],
    }
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as JsonRpcRequest | null;
  if (!body?.method) {
    return jsonRpc(body?.id ?? null, undefined, {
      code: -32600,
      message: 'Invalid Request',
    });
  }

  const access = await assertMcpAccess(request);

  if (!access) {
    logMcpAccess({ method: body.method, outcome: 'denied', reason: 'unauthorized' });
    return unauthorized(request);
  }

  try {
    switch (body.method) {
      case 'initialize':
        return jsonRpc(body.id, {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'Isaak for Holded',
            version: '0.3.0',
          },
          capabilities: {
            tools: {},
          },
        });
      case 'notifications/initialized':
        return new NextResponse(null, { status: 202 });
      case 'tools/list': {
        const visibleTools = resolveVisibleTools(access);

        return jsonRpc(body.id, {
          tools: visibleTools,
        });
      }
      case 'tools/call': {
        const name = typeof body.params?.name === 'string' ? body.params.name : '';
        const args =
          body.params?.arguments && typeof body.params.arguments === 'object'
            ? (body.params.arguments as Record<string, unknown>)
            : undefined;

        const result = await callTool(
          {
            mode: access.mode,
            tenantId: access.tenantId,
            scope: 'scope' in access ? access.scope : null,
            uid: 'uid' in access ? access.uid : null,
          },
          name,
          args
        );
        return jsonRpc(body.id, result);
      }
      default:
        return jsonRpc(body.id, undefined, {
          code: -32601,
          message: `Method not found: ${body.method}`,
        });
    }
  } catch (error) {
    return jsonRpc(body.id, undefined, {
      code: -32000,
      message: error instanceof Error ? error.message : 'Unknown MCP error',
    });
  }
}
