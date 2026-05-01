/**
 * GET /api/v1/companies/current
 *
 * Devuelve el contexto de la empresa activa del usuario autenticado.
 * Scope requerido: isaak.company.read
 */
import { requireScope } from '@/lib/isaak-platform/api/middleware/requireScope';
import { handlePlatformError, okResponse } from '@/lib/isaak-platform/api/response';
import { logAuditEvent } from '@/lib/isaak-platform/audit/auditLogger';
import { getCompanyContext } from '@/lib/isaak-platform/services/companyService';
import { NextRequest, NextResponse } from 'next/server';
import { buildV1Context } from '../../_context';

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
    requireScope(ctx, 'isaak.company.read');

    const company = await getCompanyContext(ctx);

    await logAuditEvent({
      ctx,
      method: 'GET',
      endpoint: '/api/v1/companies/current',
      toolOrAction: 'companies.current',
      status: 200,
      riskLevel: 'low',
      confirmationRequired: false,
    });

    return okResponse(company, { requestId, tenantId: ctx.tenantId });
  } catch (err) {
    return handlePlatformError(err, requestId, ctx.tenantId);
  }
}
