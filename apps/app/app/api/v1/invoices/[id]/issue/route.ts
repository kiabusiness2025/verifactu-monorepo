/**
 * POST /api/v1/invoices/[id]/issue
 *
 * Emite una factura y la registra en VeriFactu (AEAT).
 * Operación de alto riesgo — requiere confirmación explícita.
 *
 * Flujo:
 *   1. POST sin body → 202 con confirmationToken
 *   2. POST con { confirmationToken } → 200 con resultado
 *
 * Scope: isaak.verifactu.submit
 */
import {
  consumeConfirmationToken,
  createConfirmationToken,
} from '@/lib/isaak-platform/actions/confirmationTokens';
import { ConfirmationRequiredError } from '@/lib/isaak-platform/api/errors';
import { requireScope } from '@/lib/isaak-platform/api/middleware/requireScope';
import { handlePlatformError, okResponse } from '@/lib/isaak-platform/api/response';
import { logAuditEvent } from '@/lib/isaak-platform/audit/auditLogger';
import {
  submitInvoiceToAeat,
  validateInvoice,
} from '@/lib/isaak-platform/services/verifactuService';
import { NextRequest, NextResponse } from 'next/server';
import { buildV1Context } from '../../../_context';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await buildV1Context(req);
  if ('error' in authResult) {
    return NextResponse.json(
      { ok: false, error: { code: 'unauthorized', message: authResult.error } },
      { status: authResult.status }
    );
  }
  const { ctx, requestId } = authResult;

  try {
    requireScope(ctx, 'isaak.verifactu.submit');

    // Parse body — may be empty for first call
    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text.trim()) body = JSON.parse(text);
    } catch {
      // empty body is fine for first step
    }

    const confirmationToken =
      typeof body.confirmationToken === 'string' ? body.confirmationToken : null;

    if (!confirmationToken) {
      // Step 1: validate + return confirmation token
      const validation = await validateInvoice(ctx, params.id);

      const { token, expiresAt } = createConfirmationToken({
        tenantId: ctx.tenantId,
        action: 'issue_invoice',
        resourceId: params.id,
        preview: {
          invoiceId: params.id,
          validation,
          message: 'Esta acción registrará la factura en VeriFactu (AEAT). No se puede deshacer.',
        },
      });

      throw new ConfirmationRequiredError({
        confirmationToken: token,
        expiresAt,
        preview: {
          invoiceId: params.id,
          validation,
          message: 'Esta acción registrará la factura en VeriFactu (AEAT). No se puede deshacer.',
        },
      });
    }

    // Step 2: consume token + submit
    consumeConfirmationToken({
      token: confirmationToken,
      tenantId: ctx.tenantId,
      action: 'issue_invoice',
      resourceId: params.id,
    });

    const result = await submitInvoiceToAeat(ctx, params.id);

    await logAuditEvent({
      ctx,
      method: 'POST',
      endpoint: `/api/v1/invoices/${params.id}/issue`,
      toolOrAction: 'verifactu.submit',
      status: 200,
      riskLevel: 'high',
      confirmationRequired: true,
    });

    return okResponse(result, { requestId, tenantId: ctx.tenantId });
  } catch (err) {
    return handlePlatformError(err, requestId, ctx.tenantId);
  }
}
