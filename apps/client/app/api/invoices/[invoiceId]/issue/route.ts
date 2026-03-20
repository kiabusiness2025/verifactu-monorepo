import { getSessionPayload } from '@/lib/session';
import { ensureTenantAccess } from '@/src/server/workspace';
import { prisma } from '@verifactu/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getVerifactuApiBase() {
  return (
    process.env.VERIFACTU_API_URL ||
    process.env.INTERNAL_API_URL ||
    process.env.API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://api.verifactu.business'
  ).replace(/\/$/, '');
}

export async function POST(_req: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
  try {
    const session = await getSessionPayload();
    if (!session?.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId } = await ctx.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        tenantId: true,
        number: true,
        issueDate: true,
        customerName: true,
        customerNif: true,
        amountNet: true,
        amountTax: true,
        amountGross: true,
        status: true,
        tenant: { select: { nif: true, name: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    await ensureTenantAccess(session.uid, invoice.tenantId);

    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: 'Solo las facturas en borrador pueden emitirse' },
        { status: 422 }
      );
    }

    const tenantTaxId = invoice.tenant.nif ?? '';
    if (!tenantTaxId) {
      return NextResponse.json(
        {
          error: 'No se puede emitir en VeriFactu sin NIF del emisor',
          details: 'Completa el NIF de la empresa antes de emitir.',
        },
        { status: 422 }
      );
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        verifactuStatus: 'pending',
        verifactuLastError: null,
      },
    });

    const verifactuPayload = {
      id: invoice.id,
      number: invoice.number,
      issueDate: invoice.issueDate.toISOString().split('T')[0],
      customerName: invoice.customerName,
      customerNif: invoice.customerNif ?? '',
      amountNet: Number(invoice.amountNet),
      amountTax: Number(invoice.amountTax),
      amountGross: Number(invoice.amountGross),
      tenant_id: invoice.tenantId,
      tenant_nif: tenantTaxId,
      nif: tenantTaxId,
      tenant_name: invoice.tenant.name,
      tenantId: invoice.tenantId,
    };

    let apiResponse: Response;
    try {
      apiResponse = await fetch(`${getVerifactuApiBase()}/api/verifactu/register-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifactuPayload),
        cache: 'no-store',
      });
    } catch {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          verifactuStatus: 'error',
          verifactuLastError: 'VeriFactu API no disponible',
        },
      });

      return NextResponse.json(
        { error: 'No se pudo emitir la factura en VeriFactu' },
        { status: 502 }
      );
    }

    const body = (await apiResponse.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      data?: {
        verifactu_hash?: string;
        verifactu_qr?: string;
        verifactu_status?: string;
      };
    };

    if (!apiResponse.ok || !body.ok || !body.data) {
      const errorMessage =
        (typeof body.error === 'string' && body.error) ||
        `VeriFactu API error ${apiResponse.status}`;

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          verifactuStatus: 'error',
          verifactuLastError: errorMessage.slice(0, 1000),
        },
      });

      return NextResponse.json(
        {
          error: 'No se pudo emitir la factura en VeriFactu',
          details: errorMessage,
        },
        { status: 502 }
      );
    }

    const verifactuStatus =
      typeof body.data.verifactu_status === 'string' ? body.data.verifactu_status : 'validated';

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'issued',
        verifactuStatus,
        verifactuHash: body.data.verifactu_hash ?? null,
        verifactuQr: body.data.verifactu_qr ?? null,
        verifactuLastError: null,
      },
      select: {
        id: true,
        status: true,
        verifactuStatus: true,
        verifactuQr: true,
        verifactuHash: true,
      },
    });

    return NextResponse.json({ ok: true, invoice: updated }, { status: 200 });
  } catch (error) {
    console.error('Error issuing invoice:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
