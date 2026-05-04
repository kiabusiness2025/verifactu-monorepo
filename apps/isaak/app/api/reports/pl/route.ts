import { NextResponse } from 'next/server';
import { getHoldedSession } from '@/app/lib/holded-session';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/reports/pl?year=2026&month=4
 *
 * Returns a Profit & Loss summary for the given month (or YTD if no month).
 */
export async function GET(request: Request) {
  const session = await getHoldedSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);
  const monthParam = searchParams.get('month');
  const month = monthParam ? parseInt(monthParam, 10) : null;

  const from = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const to = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);

  const tenantId = session.tenantId;

  const [invoices, expenses, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId, issueDate: { gte: from, lt: to }, status: { not: 'draft' } },
      select: {
        amountNet: true,
        amountTax: true,
        amountGross: true,
        status: true,
        issueDate: true,
      },
    }),
    prisma.expenseRecord.findMany({
      where: { tenantId, date: { gte: from, lt: to }, canonicalStatus: 'confirmed' },
      select: { amount: true, taxRate: true, category: true, date: true },
    }),
    prisma.payment.findMany({
      where: { tenantId, paidAt: { gte: from, lt: to } },
      select: { amount: true, paidAt: true },
    }),
  ]);

  // Revenue
  const grossRevenue = invoices.reduce((s, i) => s + Number(i.amountGross), 0);
  const netRevenue = invoices.reduce((s, i) => s + Number(i.amountNet), 0);
  const totalTaxCharged = invoices.reduce((s, i) => s + Number(i.amountTax), 0);

  // Expenses
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const expensesByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {});

  // Cashflow (actual payments received)
  const cashReceived = payments.reduce((s, p) => s + Number(p.amount), 0);

  // P&L
  const grossProfit = grossRevenue - totalExpenses;
  const margin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

  // Monthly breakdown (for charts)
  const monthlyMap: Record<string, { revenue: number; expenses: number; payments: number }> = {};
  for (const inv of invoices) {
    const key = inv.issueDate.toISOString().slice(0, 7);
    monthlyMap[key] ??= { revenue: 0, expenses: 0, payments: 0 };
    monthlyMap[key].revenue += Number(inv.amountGross);
  }
  for (const exp of expenses) {
    const key = exp.date.toISOString().slice(0, 7);
    monthlyMap[key] ??= { revenue: 0, expenses: 0, payments: 0 };
    monthlyMap[key].expenses += Number(exp.amount);
  }
  for (const pay of payments) {
    const key = pay.paidAt.toISOString().slice(0, 7);
    monthlyMap[key] ??= { revenue: 0, expenses: 0, payments: 0 };
    monthlyMap[key].payments += Number(pay.amount);
  }

  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  return NextResponse.json({
    ok: true,
    period: { year, month, from: from.toISOString(), to: to.toISOString() },
    summary: {
      invoiceCount: invoices.length,
      expenseCount: expenses.length,
      grossRevenue,
      netRevenue,
      totalTaxCharged,
      totalExpenses,
      grossProfit,
      margin: Math.round(margin * 10) / 10,
      cashReceived,
    },
    expensesByCategory,
    monthly,
  });
}
