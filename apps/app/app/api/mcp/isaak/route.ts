/**
 * POST /api/mcp/isaak  — Isaak MCP Server
 * GET  /api/mcp/isaak  — Server descriptor
 *
 * Servidor MCP independiente del MCP de Holded.
 * Expone datos propios de Isaak (facturas, empresa, VeriFactu, fiscal, auditoría).
 * Protocolo: JSON-RPC 2.0 (MCP spec 2024-11-05)
 *
 * Autenticación:
 *  - Bearer {ISAAK_MCP_SHARED_SECRET}  → acceso completo (uso interno)
 *  - Bearer {JWT OAuth}                → scopes del token
 *  - Sin token                         → initialize + tools/list (público)
 */
import {
  consumeConfirmationToken,
  createConfirmationToken,
} from '@/lib/isaak-platform/actions/confirmationTokens';
import { ConfirmationRequiredError, MissingScopeError } from '@/lib/isaak-platform/api/errors';
import { logAuditEvent } from '@/lib/isaak-platform/audit/auditLogger';
import type { IsaakExecutionContext } from '@/lib/isaak-platform/context';
import { ISAAK_MCP_SCOPES } from '@/lib/isaak-platform/permissions/scopes';
import { proposeAction } from '@/lib/isaak-platform/services/actionService';
import { getCompanyContext } from '@/lib/isaak-platform/services/companyService';
import {
  createInvoiceDraft,
  getInvoice,
  listInvoices,
} from '@/lib/isaak-platform/services/invoiceService';
import {
  getVerifactuStatus,
  submitInvoiceToAeat,
  validateInvoice,
} from '@/lib/isaak-platform/services/verifactuService';
import {
  applyOpenAiCorsHeaders,
  getAuthorizationEndpoint,
  getAuthorizationServerMetadataUrl,
  getRegistrationEndpoint,
  getTokenEndpoint,
  getUserInfoEndpoint,
  verifyAccessToken,
} from '@/lib/oauth/mcp';
import prisma from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { resolveActiveTenant } from '@/src/server/tenant/resolveActiveTenant';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Constants ────────────────────────────────────────────────────────────────

const ISAAK_MCP_RESOURCE_PATH = '/api/mcp/isaak';
const MCP_NAME = 'Isaak MCP Server';
const MCP_VERSION = '1.0.0';
const MCP_DESCRIPTION =
  'Servidor MCP del producto Isaak para facturación VeriFactu, análisis empresarial y gestión fiscal. Datos en tiempo real del tenant autenticado.';

function getIsaakMcpResourceUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://app.verifactu.business';
  return `${base.replace(/\/$/, '')}${ISAAK_MCP_RESOURCE_PATH}`;
}

function getIsaakProtectedResourceMetadataUrl() {
  const resource = new URL(getIsaakMcpResourceUrl());
  return `${resource.origin}/.well-known/oauth-protected-resource${ISAAK_MCP_RESOURCE_PATH}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

type McpAccess = {
  mode: 'oauth' | 'shared_secret';
  tenantId: string | null;
  uid?: string | null;
  scope?: string | null;
};

// ─── Tool definitions ─────────────────────────────────────────────────────────

const ISAAK_TOOLS = [
  {
    name: 'isaak_get_company_context',
    title: 'Obtener contexto de la empresa',
    description:
      'Retorna nombre, NIF, plan, conexiones activas y KPIs básicos del tenant autenticado.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      requiresConfirmation: false,
      riskLevel: 'low',
    },
    inputSchema: { type: 'object', properties: {}, required: [] },
    scopes: ['isaak.company.read'],
  },
  {
    name: 'isaak_list_invoices',
    title: 'Listar facturas',
    description:
      'Lista facturas emitidas del tenant. Filtra por estado, rango de fechas o cliente.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      requiresConfirmation: false,
      riskLevel: 'low',
    },
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['draft', 'issued', 'paid', 'all'],
          description: 'Estado de la factura',
        },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        offset: { type: 'integer', minimum: 0, default: 0 },
        dateFrom: { type: 'string', description: 'Fecha inicio YYYY-MM-DD' },
        dateTo: { type: 'string', description: 'Fecha fin YYYY-MM-DD' },
        customerName: { type: 'string', description: 'Filtro por nombre de cliente' },
      },
    },
    scopes: ['isaak.invoices.read'],
  },
  {
    name: 'isaak_get_invoice',
    title: 'Obtener factura',
    description: 'Obtiene el detalle completo de una factura incluyendo estado VeriFactu.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      requiresConfirmation: false,
      riskLevel: 'low',
    },
    inputSchema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string', description: 'ID interno de la factura' },
      },
      required: ['invoiceId'],
    },
    scopes: ['isaak.invoices.read'],
  },
  {
    name: 'isaak_get_verifactu_status',
    title: 'Estado VeriFactu AEAT',
    description:
      'Resumen del estado de facturas en VeriFactu: emitidas, borradores, errores, último hash.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      requiresConfirmation: false,
      riskLevel: 'low',
    },
    inputSchema: {
      type: 'object',
      properties: {
        invoiceId: {
          type: 'string',
          description: 'ID de factura (opcional, para una factura específica)',
        },
      },
    },
    scopes: ['isaak.invoices.read'],
  },
  {
    name: 'isaak_get_fiscal_summary',
    title: 'Resumen fiscal y vencimientos',
    description:
      'Próximos vencimientos fiscales (IVA, IRPF, IS), estimación IVA trimestral y estado de modelos.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      requiresConfirmation: false,
      riskLevel: 'low',
    },
    inputSchema: {
      type: 'object',
      properties: {
        daysAhead: {
          type: 'integer',
          default: 90,
          description: 'Horizonte en días para vencimientos',
        },
      },
    },
    scopes: ['isaak.fiscal.read'],
  },
  {
    name: 'isaak_create_invoice_draft',
    title: 'Crear borrador de factura',
    description:
      'Crea un borrador de factura en el sistema. No la emite a AEAT. Requiere confirmación explícita para emitir.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      requiresConfirmation: false,
      riskLevel: 'low',
    },
    inputSchema: {
      type: 'object',
      properties: {
        customerName: { type: 'string' },
        customerNif: { type: 'string' },
        description: { type: 'string' },
        amountNet: { type: 'number' },
        taxRate: { type: 'number', description: '0.21 para 21%, 0.10 para 10%, etc.' },
        issueDate: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['customerName', 'description', 'amountNet', 'taxRate'],
    },
    scopes: ['isaak.invoices.write'],
  },
  {
    name: 'isaak_validate_verifactu_invoice',
    title: 'Validar factura para VeriFactu',
    description:
      'Valida los datos de una factura borrador antes de enviarla a AEAT. No envía nada. Devuelve errores de validación.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      requiresConfirmation: false,
      riskLevel: 'low',
    },
    inputSchema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string' },
      },
      required: ['invoiceId'],
    },
    scopes: ['isaak.verifactu.validate'],
  },
  {
    name: 'isaak_issue_verifactu_invoice',
    title: 'Emitir factura a VeriFactu (AEAT)',
    description:
      'Registra la factura ante AEAT mediante VeriFactu. ACCIÓN IRREVERSIBLE. Primer call devuelve preview + confirmationToken. Segundo call con confirm=true + confirmationToken ejecuta el registro.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
      requiresConfirmation: true,
      riskLevel: 'high',
    },
    inputSchema: {
      type: 'object',
      properties: {
        invoiceId: { type: 'string' },
        confirm: { type: 'boolean', default: false },
        confirmationToken: { type: 'string' },
      },
      required: ['invoiceId'],
    },
    scopes: ['isaak.verifactu.submit'],
  },
  {
    name: 'isaak_propose_action',
    title: 'Proponer acción empresarial',
    description:
      'Crea una propuesta de acción (emitir factura, registrar gasto, etc.) para revisión y aprobación del usuario.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      requiresConfirmation: false,
      riskLevel: 'medium',
    },
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['issue_invoice', 'register_expense', 'create_contact'],
          description: 'Tipo de acción a proponer',
        },
        summary: { type: 'string', description: 'Descripción en lenguaje natural de la acción' },
        payload: { type: 'object', description: 'Datos de la acción' },
      },
      required: ['type', 'summary', 'payload'],
    },
    scopes: ['isaak.actions.propose'],
  },
] as const;

const TOOL_SCOPE_MAP: Record<string, string[]> = {};
for (const tool of ISAAK_TOOLS) {
  TOOL_SCOPE_MAP[tool.name] = [...tool.scopes];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyIsaakMcpCors<T extends { headers: Headers }>(response: T, request: NextRequest) {
  response.headers.set('Cache-Control', 'no-store');
  return applyOpenAiCorsHeaders(response, request, {
    methods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['authorization', 'content-type'],
    exposeHeaders: ['WWW-Authenticate'],
  });
}

function jsonRpc(
  request: NextRequest,
  id: JsonRpcRequest['id'],
  result?: unknown,
  error?: { code: number; message: string }
) {
  return applyIsaakMcpCors(
    NextResponse.json({
      jsonrpc: '2.0',
      id: id ?? null,
      ...(error ? { error } : { result }),
    }),
    request
  );
}

function unauthorizedResponse(request: NextRequest) {
  return applyIsaakMcpCors(
    NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': `Bearer resource_metadata="${getIsaakProtectedResourceMetadataUrl()}", authorization_uri="${getAuthorizationEndpoint()}", resource="${getIsaakMcpResourceUrl()}"`,
        },
      }
    ),
    request
  );
}

function isPublicMethod(method?: string | null) {
  return (
    method === 'initialize' || method === 'notifications/initialized' || method === 'tools/list'
  );
}

async function assertMcpAccess(request: NextRequest): Promise<McpAccess | null> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;

  const sharedSecret = process.env.ISAAK_MCP_SHARED_SECRET?.trim();
  if (sharedSecret && token === sharedSecret) {
    // Shared secret: resolve tenant from session
    const session = await getSessionPayload();
    let tenantId: string | null = null;
    if (session?.uid) {
      try {
        const resolved = await resolveActiveTenant({
          userId: session.uid,
          sessionTenantId: session.tenantId ?? null,
        });
        tenantId = resolved.tenantId;
      } catch {
        // ignore
      }
    }
    return { mode: 'shared_secret', tenantId, uid: session?.uid ?? null };
  }

  const oauth = await verifyAccessToken(token);
  if (!oauth) return null;

  return {
    mode: 'oauth',
    tenantId: oauth.tenantId,
    uid: oauth.uid,
    scope: oauth.scope,
  };
}

function hasScope(access: McpAccess, requiredScope: string): boolean {
  if (access.mode === 'shared_secret') return true;
  const scopes = (access.scope ?? '').split(' ');
  return scopes.includes(requiredScope) || scopes.includes('mcp.read');
}

function getVisibleTools(access: McpAccess | null) {
  if (!access) {
    // Public: show all tools (client decides what to request)
    return ISAAK_TOOLS.map(({ name, title, description, annotations, inputSchema }) => ({
      name,
      title,
      description,
      annotations,
      inputSchema,
    }));
  }
  return ISAAK_TOOLS.filter((tool) => tool.scopes.some((s) => hasScope(access, s))).map(
    ({ name, title, description, annotations, inputSchema }) => ({
      name,
      title,
      description,
      annotations,
      inputSchema,
    })
  );
}

function formatResult(data: unknown) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function logMcpCall(event: {
  method: string;
  tool?: string;
  tenantId?: string | null;
  uid?: string | null;
  outcome: 'allowed' | 'denied' | 'error';
  reason?: string;
}) {
  console.info('[MCP Isaak]', JSON.stringify({ ts: new Date().toISOString(), ...event }));
}

async function buildCtx(access: McpAccess, requestId: string): Promise<IsaakExecutionContext> {
  if (!access.tenantId) throw new Error('No tenant resolved for this session.');
  return {
    tenantId: access.tenantId,
    userId: access.uid ?? 'mcp',
    authSubject: access.uid ?? undefined,
    channel: access.mode === 'oauth' ? 'mcp' : 'dashboard',
    scopes: [...ISAAK_MCP_SCOPES],
    requestId,
    source: access.mode === 'oauth' ? 'oauth' : 'cookie',
  };
}

// ─── Tool executor ────────────────────────────────────────────────────────────

async function callTool(
  access: McpAccess,
  name: string,
  args: Record<string, unknown> | undefined,
  requestId: string
): Promise<unknown> {
  const requiredScopes = TOOL_SCOPE_MAP[name];
  if (!requiredScopes) {
    throw new Error(`Tool desconocida: ${name}`);
  }

  for (const scope of requiredScopes) {
    if (!hasScope(access, scope)) {
      logMcpCall({
        method: 'tools/call',
        tool: name,
        tenantId: access.tenantId,
        uid: access.uid ?? null,
        outcome: 'denied',
        reason: 'missing_scope',
      });
      throw new MissingScopeError(scope);
    }
  }

  const ctx = await buildCtx(access, requestId);

  logMcpCall({
    method: 'tools/call',
    tool: name,
    tenantId: access.tenantId,
    uid: access.uid ?? null,
    outcome: 'allowed',
  });

  switch (name) {
    case 'isaak_get_company_context': {
      const company = await getCompanyContext(ctx);
      // Enrich with basic KPIs from invoices
      const [currentMonthSales, pendingCollections] = await Promise.all([
        prisma.invoice.aggregate({
          where: {
            tenantId: ctx.tenantId,
            issueDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
            status: { not: 'draft' },
          },
          _sum: { amountGross: true },
        }),
        prisma.invoice.aggregate({
          where: { tenantId: ctx.tenantId, status: 'issued' },
          _sum: { amountGross: true },
        }),
      ]);
      return {
        ...company,
        currentMonthSales: Number(currentMonthSales._sum.amountGross ?? 0),
        pendingCollections: Number(pendingCollections._sum.amountGross ?? 0),
      };
    }

    case 'isaak_list_invoices': {
      const result = await listInvoices(ctx, {
        page: Math.floor(Number(args?.offset ?? 0) / Math.max(1, Number(args?.limit ?? 20))) + 1,
        limit: Number(args?.limit ?? 20),
        status: typeof args?.status === 'string' && args.status !== 'all' ? args.status : undefined,
        from: typeof args?.dateFrom === 'string' ? args.dateFrom : undefined,
        to: typeof args?.dateTo === 'string' ? args.dateTo : undefined,
        customer: typeof args?.customerName === 'string' ? args.customerName : undefined,
      });
      return { invoices: result.items, total: result.total };
    }

    case 'isaak_get_invoice': {
      const invoiceId = typeof args?.invoiceId === 'string' ? args.invoiceId : '';
      return getInvoice(ctx, invoiceId);
    }

    case 'isaak_get_verifactu_status': {
      if (typeof args?.invoiceId === 'string') {
        return getVerifactuStatus(ctx, args.invoiceId);
      }
      // Summary for all invoices
      const stats = await prisma.invoice.groupBy({
        by: ['verifactuStatus'],
        where: { tenantId: ctx.tenantId },
        _count: { id: true },
      });
      return {
        summary: stats.map((s) => ({
          status: s.verifactuStatus ?? 'none',
          count: s._count.id,
        })),
      };
    }

    case 'isaak_get_fiscal_summary': {
      const daysAhead = Number(args?.daysAhead ?? 90);
      const horizonDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
      const now = new Date();

      // Build fiscal deadlines based on current quarter
      const month = now.getMonth(); // 0-based
      const year = now.getFullYear();

      const quarters = [
        { name: '1T IVA (Mod. 303)', deadline: new Date(year, 3, 20) }, // April 20
        { name: '2T IVA (Mod. 303)', deadline: new Date(year, 6, 20) }, // July 20
        { name: '3T IVA (Mod. 303)', deadline: new Date(year, 9, 20) }, // October 20
        { name: '4T IVA (Mod. 303)', deadline: new Date(year + 1, 0, 30) }, // Jan 30 next year
        { name: 'IRPF Anual (Mod. 100)', deadline: new Date(year, 5, 30) }, // June 30
        { name: 'IS Anual (Mod. 200)', deadline: new Date(year, 6, 25) }, // July 25
      ];

      const upcoming = quarters
        .filter((q) => q.deadline >= now && q.deadline <= horizonDate)
        .map((q) => ({
          name: q.name,
          deadline: q.deadline.toISOString().slice(0, 10),
          daysLeft: Math.ceil((q.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft);

      // Quarter IVA estimation
      const quarterStart = new Date(year, Math.floor(month / 3) * 3, 1);
      const vatSummary = await prisma.invoice.aggregate({
        where: {
          tenantId: ctx.tenantId,
          issueDate: { gte: quarterStart },
          status: { not: 'draft' },
        },
        _sum: { amountTax: true, amountNet: true, amountGross: true },
      });

      return {
        currentQuarter: `${Math.floor(month / 3) + 1}T${year}`,
        upcomingDeadlines: upcoming,
        quarterVatEstimate: {
          vatCharged: Number(vatSummary._sum.amountTax ?? 0),
          netSales: Number(vatSummary._sum.amountNet ?? 0),
          grossSales: Number(vatSummary._sum.amountGross ?? 0),
        },
      };
    }

    case 'isaak_create_invoice_draft': {
      const amountNet = Number(args?.amountNet ?? 0);
      const taxRate = Number(args?.taxRate ?? 0.21);
      const amountTax = Math.round(amountNet * taxRate * 100) / 100;
      const amountGross = Math.round((amountNet + amountTax) * 100) / 100;

      const draft = await createInvoiceDraft(ctx, {
        customerName: String(args?.customerName ?? ''),
        customerNif: typeof args?.customerNif === 'string' ? args.customerNif : undefined,
        issueDate:
          typeof args?.issueDate === 'string'
            ? args.issueDate
            : new Date().toISOString().slice(0, 10),
        notes: typeof args?.description === 'string' ? args.description : undefined,
        items: [
          {
            description: typeof args?.description === 'string' ? args.description : 'Servicio',
            quantity: 1,
            unitPrice: amountNet,
            taxRate,
            discount: 0,
          },
        ],
      });
      return {
        draft,
        message:
          'Borrador creado correctamente. Usa isaak_validate_verifactu_invoice y luego isaak_issue_verifactu_invoice para emitirla.',
      };
    }

    case 'isaak_validate_verifactu_invoice': {
      const invoiceId = typeof args?.invoiceId === 'string' ? args.invoiceId : '';
      return validateInvoice(ctx, invoiceId);
    }

    case 'isaak_issue_verifactu_invoice': {
      const invoiceId = typeof args?.invoiceId === 'string' ? args.invoiceId : '';
      const confirm = args?.confirm === true;
      const confirmationToken =
        typeof args?.confirmationToken === 'string' ? args.confirmationToken : null;

      if (!confirm || !confirmationToken) {
        // Step 1: validate and return confirmation token
        const validation = await validateInvoice(ctx, invoiceId);

        const { token, expiresAt } = createConfirmationToken({
          tenantId: ctx.tenantId,
          action: 'issue_invoice',
          resourceId: invoiceId,
          preview: { invoiceId, validation },
        });

        await logAuditEvent({
          ctx,
          method: 'POST',
          endpoint: '/api/mcp/isaak',
          toolOrAction: 'isaak_issue_verifactu_invoice:preview',
          status: 202,
          riskLevel: 'high',
          confirmationRequired: true,
        });

        return {
          preview: { invoiceId, validation },
          confirmationToken: token,
          expiresAt: expiresAt.toISOString(),
          warning:
            'Esta acción registrará la factura ante la AEAT mediante VeriFactu. Es IRREVERSIBLE. Confirma con confirm=true y el confirmationToken devuelto.',
        };
      }

      // Step 2: consume token + submit
      consumeConfirmationToken({
        token: confirmationToken,
        tenantId: ctx.tenantId,
        action: 'issue_invoice',
        resourceId: invoiceId,
      });

      const result = await submitInvoiceToAeat(ctx, invoiceId);

      await logAuditEvent({
        ctx,
        method: 'POST',
        endpoint: '/api/mcp/isaak',
        toolOrAction: 'isaak_issue_verifactu_invoice',
        status: 200,
        riskLevel: 'high',
        confirmationRequired: true,
      });

      return { issued: true, ...result };
    }

    case 'isaak_propose_action': {
      const action = await proposeAction(ctx, {
        type: String(args?.type ?? ''),
        reason: String(args?.summary ?? ''),
        payload: (args?.payload as Record<string, unknown>) ?? {},
      });
      return { proposed: true, action };
    }

    default:
      throw new Error(`Tool no implementada: ${name}`);
  }
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function OPTIONS(request: NextRequest) {
  return applyIsaakMcpCors(
    new NextResponse(null, {
      status: 204,
      headers: { Allow: 'GET, POST, OPTIONS' },
    }),
    request
  );
}

export async function GET(request: NextRequest) {
  const access = await assertMcpAccess(request);
  const tools = getVisibleTools(access);

  return applyIsaakMcpCors(
    NextResponse.json({
      name: MCP_NAME,
      version: MCP_VERSION,
      description: MCP_DESCRIPTION,
      protocol: 'MCP over JSON-RPC HTTP',
      endpoint: ISAAK_MCP_RESOURCE_PATH,
      resource: getIsaakMcpResourceUrl(),
      oauth: {
        authorizationEndpoint: getAuthorizationEndpoint(),
        tokenEndpoint: getTokenEndpoint(),
        registrationEndpoint: getRegistrationEndpoint(),
        userinfoEndpoint: getUserInfoEndpoint(),
        authorizationServerMetadata: getAuthorizationServerMetadataUrl(),
        protectedResourceMetadata: getIsaakProtectedResourceMetadataUrl(),
        resource: getIsaakMcpResourceUrl(),
      },
      tools: tools.map(({ name, title, description }) => ({ name, title, description })),
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

  if (!access && !isPublicMethod(body.method)) {
    logMcpCall({ method: body.method, outcome: 'denied', reason: 'unauthorized' });
    return unauthorizedResponse(request);
  }

  const requestId = `mcp_${Date.now().toString(36)}`;

  try {
    switch (body.method) {
      case 'initialize':
        return jsonRpc(request, body.id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: MCP_NAME,
            version: MCP_VERSION,
            description: MCP_DESCRIPTION,
          },
        });

      case 'notifications/initialized':
        return applyIsaakMcpCors(new NextResponse(null, { status: 202 }), request);

      case 'tools/list':
        return jsonRpc(request, body.id, { tools: getVisibleTools(access) });

      case 'tools/call': {
        if (!access) {
          logMcpCall({ method: body.method, outcome: 'denied', reason: 'unauthorized' });
          return unauthorizedResponse(request);
        }

        const toolName = typeof body.params?.name === 'string' ? body.params.name : '';
        const toolArgs =
          body.params?.arguments && typeof body.params.arguments === 'object'
            ? (body.params.arguments as Record<string, unknown>)
            : undefined;

        const result = await callTool(access, toolName, toolArgs, requestId);
        return jsonRpc(request, body.id, formatResult(result));
      }

      default:
        return jsonRpc(request, body.id, undefined, {
          code: -32601,
          message: `Method not found: ${body.method}`,
        });
    }
  } catch (error) {
    logMcpCall({
      method: body.method,
      tenantId: access?.tenantId,
      uid: access?.uid ?? null,
      outcome: 'error',
      reason: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof ConfirmationRequiredError) {
      return jsonRpc(request, body.id, {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                requiresConfirmation: true,
                confirmationToken: error.confirmationToken,
                expiresAt: error.expiresAt.toISOString(),
                preview: error.preview,
                warning: 'Confirma la acción con confirm=true y el confirmationToken devuelto.',
              },
              null,
              2
            ),
          },
        ],
      });
    }

    return jsonRpc(request, body.id, undefined, {
      code: -32000,
      message: error instanceof Error ? error.message : 'Error interno del servidor MCP',
    });
  }
}
