import { getSessionPayload } from '@/lib/session';
import { ensureTenantAccess } from '@/src/server/workspace';
import { prisma } from '@verifactu/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VERIFACTU_API_URL =
  process.env.VERIFACTU_API_URL ||
  process.env.INTERNAL_API_URL ||
  'https://api.verifactu.business';

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ invoiceId: string }> }
) {
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

    const verifactuPayload = {
      id: invoice.id,
      number: invoice.number,
      issueDate: invoice.issueDate.toISOString().split('T')[0],
      customerName: invoice.customerName,
      customerNif: invoice.customerNif ?? '',
      amountNet: Number(invoice.amountNet),
      amountTax: Number(invoice.amountTax),
      amountGross: Number(invoice.amountGross),
      tenant_nif: invoice.tenant.nif ?? '',
      tenant_name: invoice.tenant.name,
      tenantId: invoice.tenantId,
    };

    let verifactuResult: {
      verifactu_hash?: string;
      verifactu_qr?: string;
      verifactu_status?: string;
    } = {};

    try {
      const apiResponse = await fetch(
        `${VERIFACTU_API_URL}/api/verifactu/register-invoice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(verifactuPayload),
        }
      );

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        if (data.ok && data.data) {
          verifactuResult = {
            verifactu_hash: data.data.verifactu_hash,
            verifactu_qr: data.data.verifactu_qr,
            verifactu_status: 'validated',
          };
        }
      }
    } catch {
      // VeriFactu API no disponible — marcamos como pendiente, no bloqueante
      verifactuResult = { verifactu_status: 'pending' };
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'issued',
        verifactuStatus: verifactuResult.verifactu_status ?? 'pending',
        verifactuHash: verifactuResult.verifactu_hash ?? null,
        verifactuQr: verifactuResult.verifactu_qr ?? null,
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
