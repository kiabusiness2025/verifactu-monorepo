import { createHash } from 'crypto';
import { requireTenantContext } from '@/lib/api/tenantAuth';
import { createSyncOutbox } from '@/lib/integrations/accountingStore';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getVerifactuApiBase() {
  return (
    process.env.VERIFACTU_API_URL ||
    process.env.API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://api.verifactu.business'
  ).replace(/\/$/, '');
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireTenantContext();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: {
      tenant: {
        select: {
          nif: true,
          name: true,
          legalName: true,
        },
      },
      customer: { select: { name: true, nif: true } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (invoice.verifactuStatus === 'validated' || invoice.verifactuStatus === 'accepted') {
    return NextResponse.json({
      ok: true,
      alreadyIssued: true,
      invoice,
    });
  }

  const tenantTaxId = invoice.tenant.nif || '';
  if (!tenantTaxId) {
    return NextResponse.json(
      {
        error: 'No se puede emitir en VeriFactu sin NIF del emisor',
        details: 'Completa el NIF de la empresa en Configuración antes de emitir.',
      },
      { status: 422 }
    );
  }
  const amountNet = Number(invoice.amountNet);
  const amountTax = Number(invoice.amountTax);
  const amountGross = Number(invoice.amountGross);

  const payload = {
    id: invoice.id,
    tenant_id: invoice.tenantId,
    tenant_nif: tenantTaxId,
    nif: tenantTaxId,
    number: invoice.number,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    amountNet,
    amountTax,
    amountGross,
    total: amountGross,
    tax: {
      rate: amountNet > 0 ? Number((amountTax / amountNet).toFixed(4)) : 0,
      amount: amountTax,
    },
    customer: {
      name: invoice.customer?.name || invoice.customerName || 'Cliente',
      nif: invoice.customer?.nif || invoice.customerNif || '',
    },
    issuer: {
      name: invoice.tenant.legalName || invoice.tenant.name,
      nif: tenantTaxId,
    },
  };

  const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      verifactuStatus: 'pending',
      verifactuPayloadHash: payloadHash,
      verifactuLastError: null,
    } as never,
  });

  const response = await fetch(`${getVerifactuApiBase()}/api/verifactu/register-invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.ok) {
    const errorMessage =
      (typeof body?.error === 'string' && body.error) ||
      `VeriFactu API error ${response.status}`;

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        verifactuStatus: 'error',
        verifactuLastError: errorMessage.slice(0, 1000),
      } as never,
    });

    return NextResponse.json(
      { error: 'No se pudo emitir la factura en VeriFactu', details: errorMessage },
      { status: 502 }
    );
  }

  const data = body?.data ?? {};
  const verifactuStatus =
    (typeof data?.verifactu_status === 'string' && data.verifactu_status) || 'validated';
  const verifactuHash = typeof data?.verifactu_hash === 'string' ? data.verifactu_hash : null;
  const verifactuQr = typeof data?.verifactu_qr === 'string' ? data.verifactu_qr : null;
  const submissionId =
    (typeof data?.id === 'string' && data.id) ||
    (typeof data?.submissionId === 'string' && data.submissionId) ||
    null;

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      verifactuStatus,
      verifactuHash,
      verifactuQr,
      verifactuSubmissionId: submissionId,
      verifactuLastError: null,
    } as never,
  });
  const updatedWithMeta = updated as typeof updated & { verifactuSubmissionId?: string | null };

  await createSyncOutbox({
    tenantId: auth.tenantId,
    entityType: 'invoice',
    entityId: updated.id,
    action: 'upsert',
    payload: {
      eventType: 'invoice.issued',
      invoiceId: updated.id,
      number: updated.number,
      issueDate: updated.issueDate,
      amountGross: updated.amountGross,
      status: updated.status,
      verifactuStatus: updated.verifactuStatus,
      verifactuHash: updated.verifactuHash,
      verifactuSubmissionId: updatedWithMeta.verifactuSubmissionId || null,
    },
  });

  return NextResponse.json({
    ok: true,
    invoice: updated,
    verifactu: {
      status: updated.verifactuStatus,
      hash: updated.verifactuHash,
      qr: updated.verifactuQr,
      submissionId: updatedWithMeta.verifactuSubmissionId || null,
    },
  });
}
