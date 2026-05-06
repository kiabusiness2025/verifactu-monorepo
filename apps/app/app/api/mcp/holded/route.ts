import { markAccountingIntegrationRevoked } from '@/lib/integrations/accountingStore';
import {
  resolveSharedHoldedConnectionForTenant,
  type HoldedConnectionChannel,
} from '@/lib/integrations/holdedConnectionResolver';
import { getAllowedHoldedMcpToolNames } from '@/lib/integrations/holdedMcpScopes';
import {
  callHoldedMcpTool,
  holdedMcpTools,
  type HoldedMcpToolDefinition,
} from '@/lib/integrations/holdedMcpTools';
import { logPatUsage, PAT_PREFIX, verifyPat } from '@/lib/integrations/holdedPatStore';
import {
  applyOpenAiCorsHeaders,
  getAuthorizationEndpoint,
  getAuthorizationServerMetadataUrl,
  getDefaultScopes,
  getMcpResourceUrl,
  getProtectedResourceMetadataUrl,
  getRegistrationEndpoint,
  getSupportedScopes,
  getTokenEndpoint,
  getUserInfoEndpoint,
  hasRequiredScopes,
  MCP_TOOL_SCOPES,
  verifyAccessToken,
} from '@/lib/oauth/mcp';
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
const MCP_CONNECTOR_NAME = 'Holded Connector for ChatGPT';
const MCP_CONNECTOR_DESCRIPTION =
  'Direct MCP connector between ChatGPT and Holded powered by Verifactu. The public campaign default exposes sales invoices, contacts, accounting accounts, bounded daily ledger reads, and draft invoice creation for the connected tenant. Broader Holded surfaces require explicit OAuth scopes and later rollout phases.';

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
    mode: 'oauth' | 'shared_secret' | 'pat';
    scope?: string | null;
  } | null
) {
  if (!access) {
    return getVisibleTools(getDefaultScopes());
  }

  if (access.mode === 'shared_secret') {
    return getVisibleTools(getSupportedScopes());
  }

  // PATs default to the same scope set as a typical OAuth grant. Specific
  // PATs may narrow it via their `scopes` array; that's already reflected in
  // `access.scope` when present.
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

  // Personal Access Token branch — preferred for ChatGPT mobile and any client
  // that cannot complete the OAuth roundtrip (iOS in-app browser breaks Firebase
  // getRedirectResult; PATs sidestep the entire OAuth dance).
  if (token.startsWith(PAT_PREFIX)) {
    const pat = await verifyPat(token);
    if (!pat) {
      // Don't reveal whether the token shape is valid but revoked vs unknown.
      return null;
    }
    // Fire-and-forget audit (the request isn't blocked on this).
    void logPatUsage({
      tenantId: pat.tenantId,
      patId: pat.id,
      channel: pat.channelKey,
      ip: request.headers.get('x-forwarded-for') ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
      event: 'used',
    });
    return {
      mode: 'pat' as const,
      tenantId: pat.tenantId,
      uid: null as string | null,
      email: null as string | null,
      // Join PAT scopes with spaces so existing scope-string parsers work.
      scope: pat.scopes.join(' '),
      patId: pat.id,
      channelKey: pat.channelKey,
      connectionId: pat.connectionId,
    };
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
  mode: 'oauth' | 'shared_secret' | 'pat';
  tenantId: string | null;
  channelKey?: string | null;
}) {
  if (access?.tenantId) {
    // Channel resolution priority:
    //   - PAT carries its own channelKey (chatgpt/claude/dashboard)
    //   - OAuth always means chatgpt
    //   - shared_secret falls back to dashboard
    const channel: HoldedConnectionChannel =
      access.mode === 'pat'
        ? access.channelKey === 'dashboard'
          ? 'dashboard'
          : 'chatgpt'
        : access.mode === 'oauth'
          ? 'chatgpt'
          : 'dashboard';
    const connection = await resolveSharedHoldedConnectionForTenant(access.tenantId, channel);
    if (connection) {
      return {
        apiKey: connection.apiKey,
        source: connection.source,
      };
    }
  }

  // Keep OAuth/PAT channels isolated from dashboard session state.
  // If the bearer credential does not resolve to a tenant with a Holded
  // connection, the caller must reconnect Holded instead of falling back.
  if (access?.mode === 'oauth' || access?.mode === 'pat') {
    throw new Error(
      `No Holded API key configured for this ${access.mode === 'pat' ? 'PAT' : 'OAuth'} tenant`
    );
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

/**
 * Limit how many items we render verbatim in the human-readable text. Beyond
 * this, we add a "+ N more — call again with page=2" footer so ChatGPT mobile
 * doesn't drown in 200-row JSON dumps. Programmatic consumers still get the
 * full data via structuredContent.
 */
const TEXT_PREVIEW_LIMIT = 10;

function pickFirst<T>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') return value as T;
  }
  return undefined;
}

function summarizeItem(item: unknown): string {
  if (!item || typeof item !== 'object') return String(item);
  const obj = item as Record<string, unknown>;

  // Common label fields, ordered by preference.
  const label =
    pickFirst<string>(obj, ['name', 'fullName', 'title', 'subject', 'docNumber', 'number']) ??
    pickFirst<string>(obj, ['email', 'code', 'sku']);
  const id = pickFirst<string>(obj, ['id', '_id', 'documentId', 'invoiceId', 'contactId']);
  const date = pickFirst<string | number>(obj, ['date', 'createdAt', 'updatedAt']);
  const total = pickFirst<number | string>(obj, ['total', 'amount', 'subtotal', 'price']);
  const status = pickFirst<string>(obj, ['status', 'state']);

  const parts: string[] = [];
  if (label) parts.push(`**${label}**`);
  if (id) parts.push(`\`${String(id).slice(0, 24)}\``);
  if (date) {
    const dateText =
      typeof date === 'number'
        ? new Date(date * 1000).toISOString().slice(0, 10)
        : String(date).slice(0, 10);
    parts.push(dateText);
  }
  if (total !== undefined) parts.push(`${total}`);
  if (status) parts.push(`_${status}_`);

  return parts.length > 0 ? `- ${parts.join(' · ')}` : `- ${JSON.stringify(obj).slice(0, 120)}`;
}

function buildItemsSummary(items: unknown[], total?: number): string {
  if (items.length === 0) {
    return 'No items returned for this query.';
  }
  const preview = items.slice(0, TEXT_PREVIEW_LIMIT).map(summarizeItem).join('\n');
  const totalText = total !== undefined ? `${total}` : `${items.length}`;
  const more =
    items.length > TEXT_PREVIEW_LIMIT
      ? `\n\n_…and ${items.length - TEXT_PREVIEW_LIMIT} more in this page. Use page+limit to paginate._`
      : '';
  return `Found ${totalText} item(s). Showing the first ${Math.min(items.length, TEXT_PREVIEW_LIMIT)}:\n\n${preview}${more}`;
}

function summarizeSingleItem(item: Record<string, unknown>): string {
  const label =
    pickFirst<string>(item, ['name', 'fullName', 'title', 'subject', 'docNumber', 'number']) ??
    pickFirst<string>(item, ['email', 'code']);
  const id = pickFirst<string>(item, ['id', '_id']);
  const lines: string[] = [];
  if (label) lines.push(`**${label}**`);
  if (id) lines.push(`ID: \`${id}\``);

  // A small, curated set of fields that are useful and don't bloat the response.
  const fieldOrder = [
    'date',
    'dueDate',
    'status',
    'state',
    'currency',
    'total',
    'subtotal',
    'tax',
    'email',
    'phone',
    'address',
    'cif',
    'vatnumber',
    'type',
  ];
  for (const key of fieldOrder) {
    const value = item[key];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'object') continue;
    if (typeof value === 'number' && key.includes('date')) {
      lines.push(`${key}: ${new Date(value * 1000).toISOString().slice(0, 10)}`);
    } else {
      lines.push(`${key}: ${String(value).slice(0, 200)}`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : JSON.stringify(item, null, 2).slice(0, 500);
}

function formatToolResult(data: unknown) {
  // Concise human-readable text + full structuredContent for programmatic use.
  // The text is what ChatGPT and Claude render to the end user; reviewers on
  // mobile especially benefit from short markdown over a 5KB JSON dump.
  let text: string;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      const total =
        typeof obj.history === 'object' && obj.history !== null
          ? (obj.history as Record<string, unknown>).total
          : undefined;
      text = buildItemsSummary(obj.items, typeof total === 'number' ? total : undefined);
    } else if (obj.item && typeof obj.item === 'object') {
      text = summarizeSingleItem(obj.item as Record<string, unknown>);
    } else if (obj.created && typeof obj.created === 'object') {
      const created = obj.created as Record<string, unknown>;
      const id =
        pickFirst<string>(created, ['id', '_id', 'documentId']) ?? '(id not returned by Holded)';
      text = `Created successfully. Holded id: \`${id}\`. The draft is saved but NOT sent, finalized, charged, or emailed. Verify it from Holded UI before issuing.`;
    } else if (obj.stock && Array.isArray(obj.stock)) {
      text = buildItemsSummary(obj.stock as unknown[]);
    } else {
      // Small payloads are fine to show in JSON; large ones we truncate.
      const json = JSON.stringify(data, null, 2);
      text = json.length > 1500 ? `${json.slice(0, 1500)}\n…(truncated)` : json;
    }
  } else {
    text = JSON.stringify(data, null, 2);
  }

  return {
    content: [{ type: 'text', text }],
    structuredContent: data,
  };
}

function isHoldedCredentialRevocationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /status\s+(401|403)/i.test(message);
}

async function callTool(
  access: {
    mode: 'oauth' | 'shared_secret' | 'pat';
    tenantId: string | null;
    scope?: string | null;
    uid?: string | null;
    channelKey?: string | null;
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
    channelKey: access.channelKey ?? null,
  });
  let result;
  try {
    result = await callHoldedMcpTool(apiKey, name, args);
  } catch (error) {
    if (access.tenantId && isHoldedCredentialRevocationError(error)) {
      try {
        await markAccountingIntegrationRevoked(
          access.tenantId,
          access.mode === 'oauth' ? 'chatgpt' : 'dashboard',
          error instanceof Error ? error.message : String(error)
        );
      } catch (markError) {
        console.warn('[MCP Holded] failed to mark revoked_api state', {
          tenantId: access.tenantId,
          error: markError instanceof Error ? markError.message : String(markError),
        });
      }

      throw new Error(
        'La API key de Holded parece revocada o sin permisos. Reconecta Holded para continuar.'
      );
    }

    throw error;
  }

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
      name: MCP_CONNECTOR_NAME,
      description: MCP_CONNECTOR_DESCRIPTION,
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
            name: MCP_CONNECTOR_NAME,
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
            channelKey: 'channelKey' in access ? access.channelKey : null,
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
