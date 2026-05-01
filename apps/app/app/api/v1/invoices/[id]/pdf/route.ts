/**
 * GET /api/v1/invoices/[id]/pdf
 *
 * Genera y descarga el PDF de una factura con branding corporativo.
 * Scope: isaak.invoices.read
 */
import { ResourceNotFoundError } from '@/lib/isaak-platform/api/errors';
import { requireScope } from '@/lib/isaak-platform/api/middleware/requireScope';
import { handlePlatformError } from '@/lib/isaak-platform/api/response';
import { logAuditEvent } from '@/lib/isaak-platform/audit/auditLogger';
import { buildInvoicePdfBuffer } from '@/lib/isaak-platform/pdf/invoicePdfBuilder';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { buildV1Context } from '../../../_context';

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
        verifactuHash: true,
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

    // Get issuer data from tenant profile
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { name: true, legalName: true, nif: true },
    });

    const pdfBuffer = await buildInvoicePdfBuffer({
      id: invoice.id,
      number: invoice.number,
      issueDate: invoice.issueDate,
      issuerName: tenant?.legalName ?? tenant?.name,
      issuerNif: tenant?.nif ?? undefined,
      customerName: invoice.customerName,
      customerNif: invoice.customerNif ?? undefined,
      amountNet: Number(invoice.amountNet),
      amountTax: Number(invoice.amountTax),
      amountGross: Number(invoice.amountGross),
      notes: invoice.notes,
      verifactuStatus: invoice.verifactuStatus,
      verifactuQr: invoice.verifactuQr,
      verifactuHash: invoice.verifactuHash,
      lines: invoice.lines.map((l) => ({
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxRate: Number(l.taxRate),
        discount: Number(l.discount ?? 0),
        lineTotal: Number(l.lineTotal),
      })),
      branding: branding ?? undefined,
    });

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
