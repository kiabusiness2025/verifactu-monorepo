import { holdedAdapter } from '@/lib/integrations/accounting';
import {
  getAuthorizationEndpoint,
  getAuthorizationServerMetadataUrl,
  getMcpResourceUrl,
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

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
};

const TOOLS: ToolDefinition[] = [
  {
    name: 'holded_list_invoices',
    title: 'List invoices in Holded',
    description:
      'List invoices for the currently authorized Verifactu tenant connected to Holded. Use this to inspect invoice history before asking for a specific invoice.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          minimum: 1,
          default: 1,
          description: 'Results page number to fetch from Holded pagination.',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'Maximum number of invoices to return.',
        },
        status: {
          type: 'string',
          description: 'Optional Holded invoice status filter, if supported by the tenant account.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'holded_get_invoice',
    title: 'Get one invoice from Holded',
    description:
      'Retrieve a single Holded invoice by its Holded invoice id for the currently authorized tenant.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description:
            'The Holded invoice identifier returned by a previous invoice listing or search.',
        },
      },
      required: ['invoiceId'],
      additionalProperties: false,
    },
  },
  {
    name: 'holded_list_contacts',
    title: 'List contacts in Holded',
    description:
      'List customer or contact records from Holded for the currently authorized tenant. Use this before creating a draft invoice.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          minimum: 1,
          default: 1,
          description: 'Results page number to fetch from Holded pagination.',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'Maximum number of contacts to return.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'holded_list_accounts',
    title: 'List accounting accounts in Holded',
    description:
      'List accounting accounts available in Holded for the currently authorized tenant.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          minimum: 1,
          default: 1,
          description: 'Results page number to fetch from Holded pagination.',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'Maximum number of accounting accounts to return.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'holded_list_bookings',
    title: 'List CRM bookings in Holded',
    description:
      'List CRM bookings and agenda items from Holded for the currently authorized tenant.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          minimum: 1,
          default: 1,
          description: 'Results page number to fetch from Holded pagination.',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'Maximum number of bookings to return.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'holded_list_projects',
    title: 'List projects in Holded',
    description:
      'List projects from Holded for the currently authorized tenant so Isaak can explain workload and profitability context.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          minimum: 1,
          default: 1,
          description: 'Results page number to fetch from Holded pagination.',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'Maximum number of projects to return.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'holded_get_project',
    title: 'Get one project from Holded',
    description: 'Retrieve a single project from Holded by id for the currently authorized tenant.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The Holded project identifier returned by a previous project listing.',
        },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'holded_list_project_tasks',
    title: 'List project tasks in Holded',
    description:
      'List tasks for a specific Holded project so Isaak can explain project progress in plain language.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The Holded project identifier to inspect.',
        },
        page: {
          type: 'number',
          minimum: 1,
          default: 1,
          description: 'Results page number to fetch from Holded pagination.',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'Maximum number of tasks to return.',
        },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'holded_create_invoice_draft',
    title: 'Create invoice draft in Holded',
    description:
      'Create a draft invoice in Holded for the currently authorized tenant. This is a write action and requires explicit confirmation.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description:
            'Must be true to confirm that the user explicitly approved creating the draft invoice.',
        },
        docType: {
          type: 'string',
          default: 'invoice',
          description:
            'Document type to create in Holded. Use invoice unless there is a documented alternative for this tenant.',
        },
        payload: {
          type: 'object',
          description:
            'Draft invoice payload for Holded. It must include at least contactId and a non-empty lines array.',
        },
      },
      required: ['confirm', 'payload'],
      additionalProperties: false,
    },
  },
];

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

function unauthorized() {
  return NextResponse.json(
    {
      error: 'Unauthorized MCP access',
    },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${getProtectedResourceMetadataUrl()}", authorization_uri="${getAuthorizationEndpoint()}", resource="${getMcpResourceUrl()}"`,
      },
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
    const connection = await resolveSharedHoldedConnectionForTenant(access.tenantId);
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
      const connection = await resolveSharedHoldedConnectionForTenant(resolved.tenantId);
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
  const input = args || {};

  switch (name) {
    case 'holded_list_invoices': {
      const data = await holdedAdapter.listInvoices(apiKey, {
        page: Number(input.page || 1),
        limit: Number(input.limit || 25),
        status: typeof input.status === 'string' ? input.status : undefined,
      });
      return formatToolResult({ source, items: data });
    }
    case 'holded_get_invoice': {
      if (typeof input.invoiceId !== 'string' || !input.invoiceId.trim()) {
        throw new Error('invoiceId is required');
      }
      const data = await holdedAdapter.getInvoice(apiKey, input.invoiceId.trim());
      return formatToolResult({ source, item: data });
    }
    case 'holded_list_contacts': {
      const data = await holdedAdapter.listContacts(apiKey, {
        page: Number(input.page || 1),
        limit: Number(input.limit || 25),
      });
      return formatToolResult({ source, items: data });
    }
    case 'holded_list_accounts': {
      const data = await holdedAdapter.listAccounts(apiKey, {
        page: Number(input.page || 1),
        limit: Number(input.limit || 25),
      });
      return formatToolResult({ source, items: data });
    }
    case 'holded_list_bookings': {
      const data = await holdedAdapter.listBookings(apiKey, {
        page: Number(input.page || 1),
        limit: Number(input.limit || 25),
      });
      return formatToolResult({ source, items: data });
    }
    case 'holded_list_projects': {
      const data = await holdedAdapter.listProjects(apiKey, {
        page: Number(input.page || 1),
        limit: Number(input.limit || 25),
      });
      return formatToolResult({ source, items: data });
    }
    case 'holded_get_project': {
      if (typeof input.projectId !== 'string' || !input.projectId.trim()) {
        throw new Error('projectId is required');
      }
      const data = await holdedAdapter.getProject(apiKey, input.projectId.trim());
      return formatToolResult({ source, item: data });
    }
    case 'holded_list_project_tasks': {
      if (typeof input.projectId !== 'string' || !input.projectId.trim()) {
        throw new Error('projectId is required');
      }
      const data = await holdedAdapter.listProjectTasks(apiKey, input.projectId.trim(), {
        page: Number(input.page || 1),
        limit: Number(input.limit || 25),
      });
      return formatToolResult({ source, items: data });
    }
    case 'holded_create_invoice_draft': {
      const confirm = input.confirm === true;
      if (!confirm) {
        throw new Error('confirm=true is required for write operations');
      }

      const docType =
        typeof input.docType === 'string' && input.docType.trim()
          ? input.docType.trim()
          : 'invoice';
      const payload =
        input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload)
          ? (input.payload as Record<string, unknown>)
          : null;

      if (!payload) {
        throw new Error('payload is required');
      }
      if (typeof payload.contactId !== 'string' || !payload.contactId.trim()) {
        throw new Error('payload.contactId is required');
      }
      if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
        throw new Error('payload.lines must be a non-empty array');
      }

      const data = await holdedAdapter.createDocument(apiKey, docType, payload);
      logMcpAccess({
        method: 'tools/call',
        tool: name,
        tenantId: access.tenantId,
        uid: access.uid ?? null,
        outcome: 'allowed',
      });
      return formatToolResult({ source, created: data });
    }
    default:
      throw new Error(`Tool not found: ${name}`);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, POST, OPTIONS',
    },
  });
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    name: 'Isaak for Holded',
    description:
      'Public-ready MCP connector for Isaak and Holded. It lets authorized Verifactu users inspect invoices, contacts, accounting accounts, CRM bookings, projects, and project tasks, and create draft invoices with explicit confirmation for the connected tenant.',
    protocol: 'MCP over JSON-RPC HTTP',
    endpoint: '/api/mcp/holded',
    oauth: {
      authorizationEndpoint: getAuthorizationEndpoint(),
      tokenEndpoint: getTokenEndpoint(),
      authorizationServerMetadata: getAuthorizationServerMetadataUrl(),
      protectedResourceMetadata: getProtectedResourceMetadataUrl(),
      resource: getMcpResourceUrl(),
    },
    tools: TOOLS.map(({ name, title, description }) => ({ name, title, description })),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as JsonRpcRequest | null;
  if (!body?.method) {
    return jsonRpc(body?.id ?? null, undefined, {
      code: -32600,
      message: 'Invalid Request',
    });
  }

  try {
    switch (body.method) {
      case 'initialize':
        return jsonRpc(body.id, {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'Isaak for Holded',
            version: '0.2.0',
          },
          capabilities: {
            tools: {},
          },
        });
      case 'notifications/initialized':
        return new NextResponse(null, { status: 202 });
      case 'tools/list':
        return jsonRpc(body.id, {
          tools: TOOLS,
        });
      case 'tools/call': {
        const allowed = await assertMcpAccess(request);
        if (!allowed) {
          logMcpAccess({ method: 'tools/call', outcome: 'denied', reason: 'unauthorized' });
          return unauthorized();
        }

        const name = typeof body.params?.name === 'string' ? body.params.name : '';
        const args =
          body.params?.arguments && typeof body.params.arguments === 'object'
            ? (body.params.arguments as Record<string, unknown>)
            : undefined;

        const result = await callTool(
          {
            mode: allowed.mode,
            tenantId: allowed.tenantId,
            scope: 'scope' in allowed ? allowed.scope : null,
            uid: 'uid' in allowed ? allowed.uid : null,
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
