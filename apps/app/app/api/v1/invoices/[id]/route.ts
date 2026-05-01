/**
 * GET /api/v1/invoices/[id]     — Detalle de una factura
 *
 * Scope: isaak.invoices.read
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildV1Context } from '../../_context';
import { getInvoice } from '@/lib/isaak-platform/services/invoiceService';
import { requireScope } from '@/lib/isaak-platform/api/middleware/requireScope';
import { okResponse, handlePlatformError } from '@/lib/isaak-platform/api/response';
import { logAuditEvent } from '@/lib/isaak-platform/audit/auditLogger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    const invoice = await getInvoice(ctx, params.id);

    await logAuditEvent({
      ctx,
      method: 'GET',
      endpoint: `/api/v1/invoices/${params.id}`,
      toolOrAction: 'invoices.get',
      status: 200,
      riskLevel: 'low',
      confirmationRequired: false,
    });

    return okResponse(invoice, { requestId, tenantId: ctx.tenantId });
  } catch (err) {
    return handlePlatformError(err, requestId, ctx.tenantId);
  }
}
