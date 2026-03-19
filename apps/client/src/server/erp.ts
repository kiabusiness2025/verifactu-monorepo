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

export async function getExpensesPageData(tenantId: string) {
  const { start, end } = getCurrentMonthRange();

  const [items, monthAgg, reviewCount] = await Promise.all([
    prisma.expenseRecord.findMany({
      where: { tenantId },
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
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      amount: toNumber(item.amount),
      date: item.date.toISOString(),
    })),
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
