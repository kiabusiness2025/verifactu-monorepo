/**
 * GET /api/v1/invoices/[id]/pdf
 *
 * Genera y descarga el PDF de una factura con branding corporativo.
 * Scope: isaak.invoices.read
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildV1Context } from '../../../_context';
import { requireScope } from '@/lib/isaak-platform/api/middleware/requireScope';
import { handlePlatformError } from '@/lib/isaak-platform/api/response';
import { ResourceNotFoundError } from '@/lib/isaak-platform/api/errors';
import { logAuditEvent } from '@/lib/isaak-platform/audit/auditLogger';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const VERIFACTU_API_URL = (
  process.env.VERIFACTU_API_URL ||
  process.env.API_BASE ||
  'https://api.verifactu.business'
).replace(/\/$/, '');

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

    // Get invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
      select: {
        id: true,
        number: true,
        status: true,
        customerName: true,
        customerNif: true,
        issueDate: true,
        amountNet: true,
        amountTax: true,
        amountGross: true,
        notes: true,
        verifactuStatus: true,
        verifactuQr: true,
        lines: {
          select: {
            quantity: true,
            unitPrice: true,
            taxRate: true,
            discount: true,
            lineTotal: true,
          },
        },
      },
    });

    if (!invoice) throw new ResourceNotFoundError('Factura', params.id);

    // Get branding from tenant profile
    const profile = await prisma.tenantProfile.findUnique({
      where: { tenantId: ctx.tenantId },
      select: { adminEditHistory: true },
    });

    const raw = profile?.adminEditHistory;
    const history =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const branding =
      history.branding && typeof history.branding === 'object'
        ? (history.branding as Record<string, string>)
        : null;

    const pdfPayload = {
      ...invoice,
      amountNet: Number(invoice.amountNet),
      amountTax: Number(invoice.amountTax),
      amountGross: Number(invoice.amountGross),
      lines: invoice.lines.map((l) => ({
        ...l,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxRate: Number(l.taxRate),
        discount: Number(l.discount),
        lineTotal: Number(l.lineTotal),
      })),
      branding: branding ?? undefined,
    };

    const pdfRes = await fetch(`${VERIFACTU_API_URL}/api/verifactu/invoice-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pdfPayload),
      cache: 'no-store',
    });

    if (!pdfRes.ok) {
      throw new Error(`PDF generation failed: ${pdfRes.status}`);
    }

    const pdfBuffer = await pdfRes.arrayBuffer();
    const filename = `factura-${invoice.number ?? params.id}.pdf`;

    await logAuditEvent({
      ctx,
      method: 'GET',
      endpoint: `/api/v1/invoices/${params.id}/pdf`,
      toolOrAction: 'invoices.pdf',
      status: 200,
      riskLevel: 'low',
      confirmationRequired: false,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'x-verifactu-request-id': requestId,
      },
    });
  } catch (err) {
    return handlePlatformError(err, requestId, ctx.tenantId);
  }
}
