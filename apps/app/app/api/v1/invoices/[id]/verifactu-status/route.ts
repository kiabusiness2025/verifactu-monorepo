/**
 * GET /api/v1/invoices/[id]/verifactu-status
 *
 * Obtiene el estado actual de registro VeriFactu de una factura.
 * Scope: isaak.verifactu.validate
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildV1Context } from '../../../_context';
import { getVerifactuStatus } from '@/lib/isaak-platform/services/verifactuService';
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
    requireScope(ctx, 'isaak.verifactu.validate');

    const status = await getVerifactuStatus(ctx, params.id);

    await logAuditEvent({
      ctx,
      method: 'GET',
      endpoint: `/api/v1/invoices/${params.id}/verifactu-status`,
      toolOrAction: 'verifactu.status',
      status: 200,
      riskLevel: 'low',
      confirmationRequired: false,
    });

    return okResponse(status, { requestId, tenantId: ctx.tenantId });
  } catch (err) {
    return handlePlatformError(err, requestId, ctx.tenantId);
  }
}
