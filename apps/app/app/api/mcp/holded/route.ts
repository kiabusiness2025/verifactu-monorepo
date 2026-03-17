import { holdedAdapter } from '@/lib/integrations/accounting';
import {
  getAuthorizationEndpoint,
  getAuthorizationServerMetadataUrl,
  getMcpResourceUrl,
  getProtectedResourceMetadataUrl,
  getTokenEndpoint,
  verifyAccessToken,
} from '@/lib/oauth/mcp';
import { decryptIntegrationSecret } from '@/lib/integrations/secretCrypto';
import { getSessionPayload } from '@/lib/session';
import prisma from '@/lib/prisma';
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
    title: 'List Holded Invoices',
    description: 'Lista facturas del tenant conectado en Holded.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', minimum: 1, default: 1 },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
        status: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'holded_get_invoice',
    title: 'Get Holded Invoice',
    description: 'Obtiene una factura concreta de Holded por id.',
    inputSchema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string' },
      },
      required: ['invoiceId'],
      additionalProperties: false,
    },
  },
  {
    name: 'holded_list_contacts',
    title: 'List Holded Contacts',
    description: 'Lista contactos de Holded para preparar facturas o búsquedas.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', minimum: 1, default: 1 },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'holded_list_accounts',
    title: 'List Holded Accounts',
    description: 'Lista cuentas contables disponibles en Holded.',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', minimum: 1, default: 1 },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'holded_create_invoice_draft',
    title: 'Create Holded Invoice Draft',
    description: 'Crea una factura o borrador en Holded mediante Invoice API.',
    inputSchema: {
      type: 'object',
      properties: {
        docType: { type: 'string', default: 'invoice' },
        payload: { type: 'object' },
      },
      required: ['payload'],
      additionalProperties: false,
    },
  },
];

function jsonRpc(id: JsonRpcRequest['id'], result?: unknown, error?: { code: number; message: string }) {
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

async function resolveHoldedApiKey(access?: { tenantId: string | null }) {
  if (access?.tenantId) {
    const integration = await prisma.tenantIntegration.findUnique({
      where: {
        tenantId_provider: {
          tenantId: access.tenantId,
          provider: 'accounting_api',
        },
      },
      select: {
        apiKeyEnc: true,
        status: true,
      },
    });

    if (integration?.apiKeyEnc) {
      return {
        apiKey: decryptIntegrationSecret(integration.apiKeyEnc),
        source: 'tenant_integration' as const,
      };
    }
  }

  const session = await getSessionPayload();

  if (session?.uid) {
    const resolved = await resolveActiveTenant({
      userId: session.uid,
      sessionTenantId: session.tenantId ?? null,
    });

    if (resolved.tenantId) {
      const integration = await prisma.tenantIntegration.findUnique({
        where: {
          tenantId_provider: {
            tenantId: resolved.tenantId,
            provider: 'accounting_api',
          },
        },
        select: {
          apiKeyEnc: true,
          status: true,
        },
      });

      if (integration?.apiKeyEnc) {
        return {
          apiKey: decryptIntegrationSecret(integration.apiKeyEnc),
          source: 'tenant_integration' as const,
        };
      }
    }
  }

  const fallbackKey = process.env.HOLDED_TEST_API_KEY?.trim();
  if (fallbackKey) {
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
  access: { tenantId: string | null },
  name: string,
  args: Record<string, unknown> | undefined
) {
  const { apiKey, source } = await resolveHoldedApiKey(access);
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
    case 'holded_create_invoice_draft': {
      const docType =
        typeof input.docType === 'string' && input.docType.trim() ? input.docType.trim() : 'invoice';
      const payload =
        input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload)
          ? (input.payload as Record<string, unknown>)
          : null;

      if (!payload) {
        throw new Error('payload is required');
      }

      const data = await holdedAdapter.createDocument(apiKey, docType, payload);
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
  const allowed = await assertMcpAccess(request);
  if (!allowed) return unauthorized();

  return NextResponse.json({
    name: 'Isaak for Holded MCP',
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
  const allowed = await assertMcpAccess(request);
  if (!allowed) return unauthorized();

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
            name: 'isaak-for-holded',
            version: '0.1.0',
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
        const name = typeof body.params?.name === 'string' ? body.params.name : '';
        const args =
          body.params?.arguments && typeof body.params.arguments === 'object'
            ? (body.params.arguments as Record<string, unknown>)
            : undefined;

        const result = await callTool({ tenantId: allowed.tenantId }, name, args);
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
