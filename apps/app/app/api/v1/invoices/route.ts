/**
 * GET  /api/v1/invoices        — Lista facturas emitidas (paginación + filtros)
 * POST /api/v1/invoices        — Crea borrador de factura
 *
 * Scopes: isaak.invoices.read / isaak.invoices.write
 */
import { requireScope } from '@/lib/isaak-platform/api/middleware/requireScope';
import { handlePlatformError, okListResponse, okResponse } from '@/lib/isaak-platform/api/response';
import { logAuditEvent } from '@/lib/isaak-platform/audit/auditLogger';
import {
  createInvoiceDraft,
  listInvoices,
  type ListInvoicesOpts,
} from '@/lib/isaak-platform/services/invoiceService';
import { NextRequest, NextResponse } from 'next/server';
import { buildV1Context } from '../_context';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authResult = await buildV1Context(req);
  if ('error' in authResult) {
    return NextResponse.json(
      { ok: false, error: { code: 'unauthorized', message: authResult.error } },
      { status: authResult.status }
    );
  }
  const { ctx, requestId } = authResult;

  try {
    requireScope(ctx, 'isaak.invoices.read');

    const { searchParams } = new URL(req.url);
    const opts: ListInvoicesOpts = {
      page: searchParams.has('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.has('limit')
        ? Math.min(parseInt(searchParams.get('limit')!, 10), 100)
        : 20,
      status: searchParams.get('status') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      customer: searchParams.get('customer') ?? undefined,
    };

    const result = await listInvoices(ctx, opts);

    await logAuditEvent({
      ctx,
      method: 'GET',
      endpoint: '/api/v1/invoices',
      toolOrAction: 'invoices.list',
      status: 200,
      riskLevel: 'low',
      confirmationRequired: false,
    });

    return okListResponse(
      result.items,
      { page: opts.page!, limit: opts.limit!, total: result.total },
      { requestId, tenantId: ctx.tenantId }
    );
  } catch (err) {
    return handlePlatformError(err, requestId, ctx.tenantId);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await buildV1Context(req);
  if ('error' in authResult) {
    return NextResponse.json(
      { ok: false, error: { code: 'unauthorized', message: authResult.error } },
      { status: authResult.status }
    );
  }
  const { ctx, requestId } = authResult;

  try {
    requireScope(ctx, 'isaak.invoices.write');

    const body = await req.json();
    const draft = await createInvoiceDraft(ctx, body);

    await logAuditEvent({
      ctx,
      method: 'POST',
      endpoint: '/api/v1/invoices',
      toolOrAction: 'invoices.create_draft',
      status: 201,
      riskLevel: 'medium',
      confirmationRequired: false,
    });

    return okResponse(draft, { requestId, tenantId: ctx.tenantId, status: 201 });
  } catch (err) {
    return handlePlatformError(err, requestId, ctx.tenantId);
  }
}
