import { createHash } from 'crypto';
import { prisma } from './prisma';
import { enqueueWebhookDelivery } from './webhooks';

export type CreateInvoiceInput = {
  tenantId: string;
  userId: string;
  customerName: string;
  customerNif?: string;
  description: string;
  amountNet: number;
  taxRate: number;
  issueDate: string;
};

export type IssueResult = {
  ok: boolean;
  verifactuStatus?: string;
  verifactuHash?: string | null;
  verifactuCsv?: string | null;
  error?: string;
};

export async function createIsaakInvoiceDraft(input: CreateInvoiceInput) {
  const amountNet = Math.round(input.amountNet * 100) / 100;
  const amountTax = Math.round(amountNet * input.taxRate * 100) / 100;
  const amountGross = Math.round((amountNet + amountTax) * 100) / 100;

  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({ where: { tenantId: input.tenantId } });
  const number = `FAC-${year}-${(count + 1).toString().padStart(4, '0')}`;

  const invoice = await prisma.invoice.create({
    data: {
      tenantId: input.tenantId,
      customerName: input.customerName,
      customerNif: input.customerNif ?? null,
      number,
      issueDate: new Date(input.issueDate),
      amountNet,
      amountTax,
      amountGross,
      status: 'draft',
      notes: input.description,
      createdBy: input.userId,
    },
  });

  return { invoice, amountNet, amountTax, amountGross, taxRate: input.taxRate };
}

export async function issueIsaakInvoice(invoiceId: string, tenantId: string): Promise<IssueResult> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: { tenant: { select: { nif: true, name: true, legalName: true } } },
  });

  if (!invoice) return { ok: false, error: 'Factura no encontrada' };
  if (invoice.verifactuStatus === 'validated' || invoice.verifactuStatus === 'accepted') {
    return {
      ok: true,
      verifactuStatus: invoice.verifactuStatus,
      verifactuHash: invoice.verifactuHash,
    };
  }

  const tenant = invoice.tenant as { nif?: string | null; name: string; legalName?: string | null };
  const tenantNif = tenant.nif ?? '';
  if (!tenantNif) {
    return {
      ok: false,
      error: 'Falta el NIF de la empresa. Configúralo en Ajustes antes de emitir.',
    };
  }

  const amountNet = Number(invoice.amountNet);
  const amountTax = Number(invoice.amountTax);
  const amountGross = Number(invoice.amountGross);

  const previousIssuedInvoice = await prisma.invoice.findFirst({
    where: {
      tenantId,
      id: { not: invoice.id },
      verifactuHash: { not: null },
      OR: [
        { status: 'issued' },
        { verifactuStatus: 'validated' },
        { verifactuStatus: 'accepted' },
        { verifactuStatus: 'accepted_with_errors' },
      ],
    },
    orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
    select: { verifactuHash: true },
  });

  const payload = {
    id: invoice.id,
    tenant_id: invoice.tenantId,
    tenant_nif: tenantNif,
    nif: tenantNif,
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
    previous_verifactu_hash: previousIssuedInvoice?.verifactuHash || null,
    customer: { name: invoice.customerName, nif: invoice.customerNif ?? '' },
    issuer: { name: tenant.legalName || tenant.name, nif: tenantNif },
  };

  const payloadHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const verifactuBase = (
    process.env.VERIFACTU_API_URL ||
    process.env.API_BASE ||
    'https://api.verifactu.business'
  ).replace(/\/$/, '');

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      verifactuStatus: 'pending',
      verifactuPayloadHash: payloadHash,
      verifactuLastError: null,
    } as never,
  });

  const internalHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (internalSecret) internalHeaders['x-internal-secret'] = internalSecret;

  const res = await fetch(`${verifactuBase}/api/verifactu/register-invoice`, {
    method: 'POST',
    headers: internalHeaders,
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    data?: Record<string, unknown>;
  };

  if (!res.ok || !body?.ok) {
    const errorMessage =
      (typeof body?.error === 'string' && body.error) || `VeriFactu API error ${res.status}`;
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        verifactuStatus: 'error',
        verifactuLastError: errorMessage.slice(0, 1000),
      } as never,
    });
    return { ok: false, error: errorMessage };
  }

  const data = body?.data ?? {};
  const verifactuStatus =
    (typeof data?.verifactu_status === 'string' && data.verifactu_status) || 'validated';
  const verifactuHash = typeof data?.verifactu_hash === 'string' ? data.verifactu_hash : null;
  const verifactuCsv = typeof data?.verifactu_csv === 'string' ? data.verifactu_csv : null;
  const aeatError = typeof data?.aeat_error_desc === 'string' ? data.aeat_error_desc : null;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: verifactuStatus === 'rejected' ? 'draft' : 'issued',
      verifactuStatus,
      verifactuHash,
      verifactuQr: typeof data?.verifactu_qr === 'string' ? data.verifactu_qr : null,
      verifactuSubmissionId: verifactuCsv,
      verifactuLastError: aeatError?.slice(0, 1000) ?? null,
    } as never,
  });

  // Outbound webhooks — best effort. The invoice is already issued; webhook
  // failures must NOT propagate to the caller. We only fire when AEAT
  // accepted the registration (not when status is 'rejected').
  if (verifactuStatus !== 'rejected') {
    try {
      await enqueueWebhookDelivery({
        tenantId,
        eventType: 'invoice.issued',
        data: {
          invoiceId: invoice.id,
          number: invoice.number,
          amount: amountGross,
          amountNet,
          amountTax,
          currency: 'EUR',
          customerName: invoice.customerName,
          customerNif: invoice.customerNif,
          issueDate: invoice.issueDate.toISOString().slice(0, 10),
          verifactuHash,
          verifactuCsv,
          verifactuStatus,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        '[invoice-service] enqueueWebhookDelivery(invoice.issued) failed',
        err instanceof Error ? err.message : err
      );
    }
  }

  return { ok: true, verifactuStatus, verifactuHash, verifactuCsv };
}
