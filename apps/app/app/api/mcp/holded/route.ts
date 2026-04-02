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
  getRegistrationEndpoint,
  getSupportedScopes,
  getUserInfoEndpoint,
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

function applyMcpCors<T extends { headers: Headers }>(response: T, request: NextRequest) {
  response.headers.set('Cache-Control', 'no-store');

  return applyOpenAiCorsHeaders(response, request, {
    methods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['authorization', 'content-type'],
    exposeHeaders: ['WWW-Authenticate'],
  });
}

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

function isPublicMcpMethod(method?: string | null) {
  return (
    method === 'initialize' || method === 'notifications/initialized' || method === 'tools/list'
  );
}

function jsonRpc(
  request: NextRequest,
  id: JsonRpcRequest['id'],
  result?: unknown,
  error?: { code: number; message: string }
) {
  return applyMcpCors(
    NextResponse.json({
      jsonrpc: '2.0',
      id: id ?? null,
      ...(error ? { error } : { result }),
    }),
    request
  );
}

function unauthorized(request: NextRequest) {
  return applyMcpCors(
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
    request
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
  return applyMcpCors(
    new NextResponse(null, {
      status: 204,
      headers: {
        Allow: 'GET, POST, OPTIONS',
      },
    }),
    request
  );
}

export async function GET(request: NextRequest) {
  const access = await assertMcpAccess(request);
  const visibleTools = resolveVisibleTools(access);

  return applyMcpCors(
    NextResponse.json({
      name: 'Isaak for Holded',
      description:
        'Public-ready MCP connector for Isaak and Holded. By default it exposes a review-safe subset for invoices, contacts, accounting accounts, CRM bookings, project context, and invoice draft creation for the connected tenant. Broader Holded surfaces remain available behind additional scopes.',
      protocol: 'MCP over JSON-RPC HTTP',
      endpoint: '/api/mcp/holded',
      oauth: {
        authorizationEndpoint: getAuthorizationEndpoint(),
        tokenEndpoint: getTokenEndpoint(),
        registrationEndpoint: getRegistrationEndpoint(),
        userinfoEndpoint: getUserInfoEndpoint(),
        authorizationServerMetadata: getAuthorizationServerMetadataUrl(),
        protectedResourceMetadata: getProtectedResourceMetadataUrl(),
        resource: getMcpResourceUrl(),
      },
      tools: visibleTools.map(({ name, title, description }) => ({ name, title, description })),
    }),
    request
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as JsonRpcRequest | null;
  if (!body?.method) {
    return jsonRpc(request, body?.id ?? null, undefined, {
      code: -32600,
      message: 'Invalid Request',
    });
  }

  const access = await assertMcpAccess(request);

  if (!access && !isPublicMcpMethod(body.method)) {
    logMcpAccess({ method: body.method, outcome: 'denied', reason: 'unauthorized' });
    return unauthorized(request);
  }

  try {
    switch (body.method) {
      case 'initialize':
        return jsonRpc(request, body.id, {
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
        return applyMcpCors(new NextResponse(null, { status: 202 }), request);
      case 'tools/list': {
        const visibleTools = resolveVisibleTools(access);

        return jsonRpc(request, body.id, {
          tools: visibleTools,
        });
      }
      case 'tools/call': {
        if (!access) {
          logMcpAccess({ method: body.method, outcome: 'denied', reason: 'unauthorized' });
          return unauthorized(request);
        }

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
        return jsonRpc(request, body.id, result);
      }
      default:
        return jsonRpc(request, body.id, undefined, {
          code: -32601,
          message: `Method not found: ${body.method}`,
        });
    }
  } catch (error) {
    return jsonRpc(request, body.id, undefined, {
      code: -32000,
      message: error instanceof Error ? error.message : 'Unknown MCP error',
    });
  }
}
