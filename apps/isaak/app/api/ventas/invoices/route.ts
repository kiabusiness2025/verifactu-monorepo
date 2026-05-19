import { NextRequest, NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { createIsaakInvoiceDraft, issueIsaakInvoice } from '@/app/lib/invoice-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getHoldedSession().catch(() => null);
  if (!session?.tenantId || !session.userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    customerName?: string;
    customerNif?: string;
    description?: string;
    amountNet?: number;
    taxRate?: number;
    issueDate?: string;
  } | null;

  if (!body) return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });

  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const amountNet = typeof body.amountNet === 'number' ? body.amountNet : NaN;
  const taxRate = typeof body.taxRate === 'number' ? body.taxRate : 0.21;
  const today = new Date().toISOString().slice(0, 10);
  const issueDate =
    typeof body.issueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.issueDate)
      ? body.issueDate
      : today;

  if (!customerName)
    return NextResponse.json({ error: 'Falta el nombre del cliente' }, { status: 400 });
  if (!description) return NextResponse.json({ error: 'Falta la descripción' }, { status: 400 });
  if (!Number.isFinite(amountNet) || amountNet <= 0)
    return NextResponse.json({ error: 'Importe neto inválido' }, { status: 400 });
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1)
    return NextResponse.json({ error: 'Tipo de IVA inválido' }, { status: 400 });

  const { invoice, amountTax, amountGross } = await createIsaakInvoiceDraft({
    tenantId: session.tenantId,
    userId: session.userId,
    customerName,
    customerNif: typeof body.customerNif === 'string' ? body.customerNif.trim() : undefined,
    description,
    amountNet,
    taxRate,
    issueDate,
  });

  const result = await issueIsaakInvoice(invoice.id, session.tenantId);

  return NextResponse.json({
    ok: result.ok,
    error: result.error,
    invoice: {
      id: invoice.id,
      number: invoice.number,
      customerName: invoice.customerName,
      customerNif: invoice.customerNif,
      issueDate: invoice.issueDate.toISOString().slice(0, 10),
      amountNet: Number(invoice.amountNet),
      amountTax,
      amountGross,
      taxRate,
      description,
    },
    verifactuStatus: result.verifactuStatus,
    verifactuHash: result.verifactuHash,
  });
}
