import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import type { IsaakExecutionContext } from '../context';
import {
  AlreadySubmittedError,
  ResourceNotFoundError,
  ValidationError,
  VerifactuSubmissionError,
} from '../api/errors';

function getVerifactuApiBase(): string {
  return (
    process.env.VERIFACTU_API_URL ||
    process.env.API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://api.verifactu.business'
  ).replace(/\/$/, '');
}

export type VerifactuValidationResult = {
  valid: boolean;
  warnings: string[];
  errors: string[];
  readyToIssue: boolean;
};

export async function validateInvoice(
  ctx: IsaakExecutionContext,
  invoiceId: string
): Promise<VerifactuValidationResult> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: ctx.tenantId },
    include: {
      tenant: { select: { nif: true, name: true, legalName: true } },
    },
  });

  if (!invoice) throw new ResourceNotFoundError('Factura', invoiceId);

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!invoice.tenant.nif) errors.push('El NIF del emisor es obligatorio para VeriFactu.');
  if (!invoice.number) errors.push('La factura debe tener número.');
  if (!invoice.issueDate) errors.push('La factura debe tener fecha de emisión.');
  if (Number(invoice.amountGross) <= 0) errors.push('El importe total debe ser mayor que cero.');
  if (!invoice.customerName) warnings.push('El nombre del cliente no está especificado.');
  if (invoice.verifactuStatus === 'validated' || invoice.verifactuStatus === 'accepted') {
    warnings.push('Esta factura ya fue enviada a la AEAT.');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    readyToIssue: errors.length === 0 && invoice.verifactuStatus !== 'validated',
  };
}

export type VerifactuSubmitResult = {
  invoiceId: string;
  verifactuStatus: string;
  verifactuHash: string | null;
  verifactuQr: string | null;
  submissionId: string | null;
  submittedAt: Date;
};

export async function submitInvoiceToAeat(
  ctx: IsaakExecutionContext,
  invoiceId: string
): Promise<VerifactuSubmitResult> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: ctx.tenantId },
    include: {
      tenant: { select: { nif: true, name: true, legalName: true } },
      customer: { select: { name: true, nif: true } },
    },
  });

  if (!invoice) throw new ResourceNotFoundError('Factura', invoiceId);
  if (invoice.verifactuStatus === 'validated' || invoice.verifactuStatus === 'accepted') {
    throw new AlreadySubmittedError('La factura');
  }

  const tenantNif = invoice.tenant.nif;
  if (!tenantNif) {
    throw new ValidationError(
      'No se puede emitir en VeriFactu sin NIF del emisor. Completa el NIF en Configuración.'
    );
  }

  const amountNet = Number(invoice.amountNet);
  const amountTax = Number(invoice.amountTax);
  const amountGross = Number(invoice.amountGross);

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
    customer: {
      name: invoice.customer?.name || invoice.customerName || 'Cliente',
      nif: invoice.customer?.nif || invoice.customerNif || '',
    },
    issuer: { name: invoice.tenant.legalName || invoice.tenant.name, nif: tenantNif },
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
    const errMsg =
      (typeof body?.error === 'string' && body.error) || `VeriFactu API error ${response.status}`;
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { verifactuStatus: 'error', verifactuLastError: errMsg.slice(0, 1000) } as never,
    });
    throw new VerifactuSubmissionError('No se pudo emitir la factura en VeriFactu.', errMsg);
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

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      verifactuStatus,
      verifactuHash,
      verifactuQr,
      verifactuSubmissionId: submissionId,
      verifactuLastError: null,
    } as never,
  });

  return {
    invoiceId: invoice.id,
    verifactuStatus,
    verifactuHash,
    verifactuQr,
    submissionId,
    submittedAt: new Date(),
  };
}

export async function getVerifactuStatus(
  ctx: IsaakExecutionContext,
  invoiceId: string
): Promise<{
  invoiceId: string;
  status: string | null;
  hash: string | null;
  qrUrl: string | null;
  submittedAt: Date | null;
}> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: ctx.tenantId },
    select: {
      id: true,
      verifactuStatus: true,
      verifactuHash: true,
      verifactuQr: true,
      updatedAt: true,
    },
  });

  if (!invoice) throw new ResourceNotFoundError('Factura', invoiceId);

  return {
    invoiceId: invoice.id,
    status: invoice.verifactuStatus,
    hash: invoice.verifactuHash,
    qrUrl: invoice.verifactuQr,
    submittedAt: ['validated', 'accepted', 'error'].includes(invoice.verifactuStatus ?? '')
      ? invoice.updatedAt
      : null,
  };
}
