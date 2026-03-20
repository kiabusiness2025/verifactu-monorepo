import { prisma } from '@verifactu/db';
import type { SessionPayload } from '@verifactu/utils';
import { getWorkspaceStateFromSession } from './workspace';

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === 'object' && 'toNumber' in value) {
    const maybeDecimal = value as { toNumber?: () => number };
    const parsed = maybeDecimal.toNumber?.();
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getCurrentMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export async function resolveTenantFromSession(session: SessionPayload, tenantSlug: string) {
  const workspace = await getWorkspaceStateFromSession(session);
  const tenant = workspace.tenants.find((item) => item.slug === tenantSlug);

  if (!tenant) {
    throw new Error('Empresa no encontrada para esta sesión');
  }

  return tenant;
}

export async function getInvoicesPageData(tenantId: string) {
  const { start, end } = getCurrentMonthRange();

  const [items, monthAgg, pendingCount, draftCount] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      select: {
        id: true,
        number: true,
        customerName: true,
        issueDate: true,
        amountGross: true,
        status: true,
        verifactuStatus: true,
      },
    }),
    prisma.invoice.aggregate({
      where: {
        tenantId,
        issueDate: { gte: start, lt: end },
        status: { not: 'draft' },
      },
      _sum: { amountGross: true },
      _count: { _all: true },
    }),
    prisma.invoice.count({
      where: {
        tenantId,
        status: 'issued',
      },
    }),
    prisma.invoice.count({
      where: {
        tenantId,
        status: 'draft',
      },
    }),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      amountGross: toNumber(item.amountGross),
      issueDate: item.issueDate.toISOString(),
    })),
    summary: {
      totalMonth: toNumber(monthAgg._sum.amountGross),
      countMonth: Number(monthAgg._count._all ?? 0),
      pendingCount,
      draftCount,
    },
  };
}

export async function getExpensesPageData(
  tenantId: string,
  filters?: { status?: string; category?: string }
) {
  const { start, end } = getCurrentMonthRange();

  const where = {
    tenantId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.category ? { category: filters.category } : {}),
  };

  const [items, monthAgg, reviewCount, categories] = await Promise.all([
    prisma.expenseRecord.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      select: {
        id: true,
        date: true,
        description: true,
        category: true,
        amount: true,
        status: true,
        supplier: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.expenseRecord.aggregate({
      where: {
        tenantId,
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expenseRecord.count({
      where: {
        tenantId,
        status: 'received',
      },
    }),
    prisma.expenseRecord.findMany({
      where: { tenantId },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    }),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      amount: toNumber(item.amount),
      date: item.date.toISOString(),
    })),
    categories: categories.map((item) => item.category),
    summary: {
      totalMonth: toNumber(monthAgg._sum.amount),
      countMonth: Number(monthAgg._count._all ?? 0),
      reviewCount,
    },
  };
}

export async function getCustomersPageData(tenantId: string) {
  const [items, activeCount, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId },
      orderBy: [{ createdAt: 'desc' }],
      take: 12,
      select: {
        id: true,
        name: true,
        email: true,
        nif: true,
        phone: true,
        city: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    }),
    prisma.customer.count({
      where: { tenantId, isActive: true },
    }),
    prisma.customer.count({
      where: { tenantId },
    }),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    })),
    summary: {
      activeCount,
      totalCount,
    },
  };
}

export async function getCustomersForDropdown(tenantId: string) {
  const customers = await prisma.customer.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      nif: true,
      email: true,
    },
    orderBy: { name: 'asc' },
  });

  return customers;
}

export async function getSuppliersForDropdown(tenantId: string) {
  const suppliers = await prisma.supplier.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      nif: true,
    },
    orderBy: { name: 'asc' },
  });

  return suppliers;
}

export async function getNextInvoiceNumber(tenantId: string) {
  const lastInvoice = await prisma.invoice.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: { number: true },
  });

  if (!lastInvoice) {
    return `VF-${new Date().getFullYear()}-001`;
  }

  // Parse last number: VF-2026-001 -> 001
  const match = lastInvoice.number.match(/(\d+)$/);
  const lastNum = match ? parseInt(match[1], 10) : 0;
  const newNum = (lastNum + 1).toString().padStart(3, '0');
  const year = new Date().getFullYear();

  return `VF-${year}-${newNum}`;
}

export async function getInvoiceDetail(invoiceId: string, tenantId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    select: {
      id: true,
      number: true,
      issueDate: true,
      customerName: true,
      customerNif: true,
      amountNet: true,
      amountTax: true,
      amountGross: true,
      status: true,
      verifactuStatus: true,
      verifactuQr: true,
      verifactuHash: true,
      notes: true,
      createdAt: true,
      customer: {
        select: { id: true, name: true, email: true, nif: true },
      },
    },
  });

  if (!invoice) return null;

  return {
    ...invoice,
    amountNet: toNumber(invoice.amountNet),
    amountTax: toNumber(invoice.amountTax),
    amountGross: toNumber(invoice.amountGross),
    issueDate: invoice.issueDate.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    verifactuLastError: null as string | null,
  };
}

export async function getExpenseDetail(expenseId: string, tenantId: string) {
  const expense = await prisma.expenseRecord.findFirst({
    where: { id: expenseId, tenantId },
    select: {
      id: true,
      date: true,
      description: true,
      category: true,
      amount: true,
      taxRate: true,
      status: true,
      docType: true,
      taxCategory: true,
      reference: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      supplier: {
        select: {
          id: true,
          name: true,
          nif: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!expense) return null;

  return {
    ...expense,
    amount: toNumber(expense.amount),
    taxRate: toNumber(expense.taxRate),
    date: expense.date.toISOString(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}
