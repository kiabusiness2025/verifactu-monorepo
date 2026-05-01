import prisma from '@/lib/prisma';
import type { IsaakExecutionContext } from '../context';
import { ResourceNotFoundError, ValidationError } from '../api/errors';

export type InvoiceListItem = {
  id: string;
  number: string | null;
  status: string;
  customerName: string | null;
  customerNif: string | null;
  issueDate: Date;
  amountNet: number;
  amountTax: number;
  amountGross: number;
  verifactuStatus: string | null;
  verifactuHash: string | null;
  verifactuQr: string | null;
  createdAt: Date;
};

export type InvoiceDetail = InvoiceListItem & {
  lines: {
    id: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount: number;
    lineTotal: number;
    articleId: string | null;
  }[];
  notes: string | null;
};

export type ListInvoicesOpts = {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
  customer?: string;
};

export async function listInvoices(
  ctx: IsaakExecutionContext,
  opts: ListInvoicesOpts = {}
): Promise<{ items: InvoiceListItem[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (opts.status) where.status = opts.status;
  if (opts.customer) {
    where.OR = [
      { customerName: { contains: opts.customer, mode: 'insensitive' } },
      { customerNif: { contains: opts.customer, mode: 'insensitive' } },
    ];
  }
  if (opts.from || opts.to) {
    where.issueDate = {
      ...(opts.from ? { gte: new Date(opts.from) } : {}),
      ...(opts.to ? { lte: new Date(opts.to) } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { issueDate: 'desc' },
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
        verifactuStatus: true,
        verifactuHash: true,
        verifactuQr: true,
        createdAt: true,
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      ...r,
      amountNet: Number(r.amountNet),
      amountTax: Number(r.amountTax),
      amountGross: Number(r.amountGross),
    })),
    total,
    page,
    limit,
  };
}

export async function getInvoice(
  ctx: IsaakExecutionContext,
  invoiceId: string
): Promise<InvoiceDetail> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: ctx.tenantId },
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
      verifactuStatus: true,
      verifactuHash: true,
      verifactuQr: true,
      notes: true,
      createdAt: true,
      lines: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          taxRate: true,
          discount: true,
          lineTotal: true,
          articleId: true,
        },
      },
    },
  });

  if (!invoice) throw new ResourceNotFoundError('Factura', invoiceId);

  return {
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
  };
}

export type CreateDraftInput = {
  customerName: string;
  customerNif?: string;
  customerId?: string;
  issueDate: string;
  dueDate?: string;
  notes?: string;
  items: {
    description?: string;
    articleId?: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount?: number;
  }[];
};

export async function createInvoiceDraft(
  ctx: IsaakExecutionContext,
  input: CreateDraftInput
): Promise<InvoiceDetail> {
  if (!input.items.length) throw new ValidationError('La factura debe tener al menos una línea.');

  const amountNet = input.items.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice * (1 - (l.discount ?? 0) / 100),
    0
  );
  const amountTax = input.items.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice * (1 - (l.discount ?? 0) / 100) * (l.taxRate / 100),
    0
  );
  const amountGross = amountNet + amountTax;

  const created = await prisma.invoice.create({
    data: {
      tenantId: ctx.tenantId,
      createdBy: ctx.userId,
      customerName: input.customerName,
      customerNif: input.customerNif ?? null,
      customerId: input.customerId ?? null,
      issueDate: new Date(input.issueDate),
      status: 'draft',
      amountNet,
      amountTax,
      amountGross,
      notes: input.notes ?? '',
    } as never,
    select: { id: true },
  });

  await prisma.invoiceLine.createMany({
    data: input.items.map((l) => ({
      invoiceId: created.id,
      articleId: l.articleId ?? null,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate / 100,
      discount: l.discount ?? 0,
      lineTotal: l.quantity * l.unitPrice * (1 - (l.discount ?? 0) / 100),
    })) as never,
  });

  return getInvoice(ctx, created.id);
}
