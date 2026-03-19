import { prisma } from '@verifactu/db';
import type { SessionPayload } from '@verifactu/utils';
import { ensureTenantAccess, resolveSessionUser } from './workspace';

export type ClientDashboardSummary = {
  salesMonth: number;
  expensesMonth: number;
  profitMonth: number;
  invoiceCountMonth: number;
  expenseCountMonth: number;
  draftInvoicesCount: number;
  pendingInvoicesCount: number;
  verifactuPendingCount: number;
  expenseReviewCount: number;
  customerCount: number;
};

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

export async function getClientDashboardSummary(
  session: SessionPayload,
  tenantId: string
): Promise<ClientDashboardSummary> {
  const user = await resolveSessionUser(session);
  await ensureTenantAccess(user.id, tenantId);

  const { start, end } = getCurrentMonthRange();

  const [invoiceAgg, expenseAgg, draftInvoicesCount, pendingInvoicesCount, verifactuPendingCount, expenseReviewCount, customerCount] =
    await Promise.all([
      prisma.invoice.aggregate({
        where: {
          tenantId,
          issueDate: { gte: start, lt: end },
          status: { not: 'draft' },
        },
        _sum: { amountGross: true },
        _count: { _all: true },
      }),
      prisma.expenseRecord.aggregate({
        where: {
          tenantId,
          date: { gte: start, lt: end },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.invoice.count({
        where: {
          tenantId,
          status: 'draft',
        },
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
          status: { not: 'draft' },
          OR: [
            { verifactuStatus: null },
            { verifactuStatus: 'pending' },
            { verifactuStatus: 'error' },
          ],
        },
      }),
      prisma.expenseRecord.count({
        where: {
          tenantId,
          status: 'received',
        },
      }),
      prisma.customer.count({
        where: {
          tenantId,
          isActive: true,
        },
      }),
    ]);

  const salesMonth = toNumber(invoiceAgg._sum.amountGross);
  const expensesMonth = toNumber(expenseAgg._sum.amount);

  return {
    salesMonth,
    expensesMonth,
    profitMonth: salesMonth - expensesMonth,
    invoiceCountMonth: Number(invoiceAgg._count._all ?? 0),
    expenseCountMonth: Number(expenseAgg._count._all ?? 0),
    draftInvoicesCount,
    pendingInvoicesCount,
    verifactuPendingCount,
    expenseReviewCount,
    customerCount,
  };
}