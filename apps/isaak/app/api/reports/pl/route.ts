import { getHoldedConnection } from '@/app/lib/holded-integration';
import { holdedListDocuments, holdedListPayments } from '@/app/lib/holded-api';
import { getHoldedSession } from '@/app/lib/holded-session';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/reports/pl?year=2026&month=4
 *
 * Returns a Profit & Loss summary for the given month (or YTD if no month).
 * Data comes from Holded in real time — no local sync needed.
 */
export async function GET(request: Request) {
  const session = await getHoldedSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conn = await getHoldedConnection(session.tenantId);
  if (!conn?.apiKey) {
    return NextResponse.json(
      { ok: false, error: 'No hay conexión Holded activa.' },
      { status: 422 }
    );
  }
  const apiKey = conn.apiKey; // already decrypted

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);
  const monthParam = searchParams.get('month');
  const month = monthParam ? parseInt(monthParam, 10) : null;

  // Unix timestamps for the period
  const from = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const to = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
  const starttmp = String(Math.floor(from.getTime() / 1000));
  const endtmp = String(Math.floor(to.getTime() / 1000));

  const [ventasRes, comprasRes, paymentsRes] = await Promise.all([
    holdedListDocuments(apiKey, { docType: 'invoice', starttmp, endtmp, limit: 500 }),
    holdedListDocuments(apiKey, { docType: 'purchase', starttmp, endtmp, limit: 500 }),
    holdedListPayments(apiKey, { starttmp, endtmp, limit: 500 }),
  ]);

  type RawDoc = Record<string, unknown>;
  type RawPayment = Record<string, unknown>;

  const ventas = (ventasRes.documents as RawDoc[]).filter(
    (d) => d.status !== 'draft' && d.status !== 'cancelled' && d.status !== 'void'
  );
  const compras = comprasRes.documents as RawDoc[];
  const payments = paymentsRes.payments as RawPayment[];

  // Revenue totals
  const grossRevenue = ventas.reduce((s, d) => s + Number(d.total ?? 0), 0);
  const netRevenue = ventas.reduce((s, d) => s + Number(d.subtotal ?? 0), 0);
  const totalTaxCharged = grossRevenue - netRevenue;

  // Expense totals
  const totalExpenses = compras.reduce((s, d) => s + Number(d.total ?? 0), 0);

  // Cashflow
  const cashReceived = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);

  // Profit
  const grossProfit = grossRevenue - totalExpenses;
  const margin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

  // Expenses by supplier (contact name)
  const expensesByCategory = compras.reduce<Record<string, number>>((acc, d) => {
    const contact = (d.contact ?? {}) as RawDoc;
    const cat = String(contact.name ?? d.contactName ?? 'Sin categoría');
    acc[cat] = (acc[cat] ?? 0) + Number(d.total ?? 0);
    return acc;
  }, {});

  // Monthly breakdown for chart
  function docMonth(d: RawDoc): string {
    const ts = Number(d.date ?? 0);
    if (!ts) return '';
    const dt = new Date(ts * 1000);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  }

  const monthlyMap: Record<string, { revenue: number; expenses: number; payments: number }> = {};
  for (const d of ventas) {
    const key = docMonth(d);
    if (!key) continue;
    monthlyMap[key] ??= { revenue: 0, expenses: 0, payments: 0 };
    monthlyMap[key].revenue += Number(d.total ?? 0);
  }
  for (const d of compras) {
    const key = docMonth(d);
    if (!key) continue;
    monthlyMap[key] ??= { revenue: 0, expenses: 0, payments: 0 };
    monthlyMap[key].expenses += Number(d.total ?? 0);
  }
  for (const p of payments) {
    const ts = Number(p.date ?? 0);
    if (!ts) continue;
    const dt = new Date(ts * 1000);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] ??= { revenue: 0, expenses: 0, payments: 0 };
    monthlyMap[key].payments += Number(p.amount ?? 0);
  }

  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  return NextResponse.json({
    ok: true,
    period: { year, month, from: from.toISOString(), to: to.toISOString() },
    summary: {
      invoiceCount: ventas.length,
      expenseCount: compras.length,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      totalTaxCharged: Math.round(totalTaxCharged * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      margin: Math.round(margin * 10) / 10,
      cashReceived: Math.round(cashReceived * 100) / 100,
    },
    expensesByCategory,
    monthly,
    truncated: ventasRes.truncated || comprasRes.truncated,
  });
}
