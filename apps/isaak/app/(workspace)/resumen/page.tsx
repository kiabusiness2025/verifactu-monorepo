import type { Metadata } from 'next';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  Calculator,
  Clock,
  FileCheck,
  Landmark,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Suspense } from 'react';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
import { buildRangeSummary, type HoldedAccountingPnL } from '@/app/lib/holded-analytics';
import {
  loadIsaakWorkspaceSignals,
  type IsaakVerifactuSignal,
} from '@/app/lib/isaak-workspace-signals';
import { prisma } from '@/app/lib/prisma';
import ResumenChart, { type MonthlyPoint } from './components/ResumenChart';
import CashFlowChart, { type CashFlowPoint } from './components/CashFlowChart';

export const metadata: Metadata = { title: 'Resumen — Isaak' };

function fmt(amount: number | null | undefined, fallback = '—') {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return fallback;
  if (amount >= 1_000_000)
    return `${(amount / 1_000_000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M€`;
  if (amount >= 10_000)
    return `${(amount / 1_000).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} k€`;
  return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
}

function buildMonthlyChart(
  snapshot: Parameters<typeof buildRangeSummary>[0],
  months = 6
): MonthlyPoint[] {
  const now = new Date();
  const points: MonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const summary = buildRangeSummary(snapshot, start, end);
    const label = start.toLocaleDateString('es-ES', { month: 'short' });
    points.push({
      month: label.charAt(0).toUpperCase() + label.slice(1),
      sales: summary.sales,
      expenses: summary.expenseSignals > 0 ? summary.expenses : null,
    });
  }
  return points;
}

type KpiCard = {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  color: string;
  bg: string;
};

type VerifactuStats = {
  issued: number;
  drafts: number;
  errors: number;
};

type CashForecast = {
  currentBalance: number;
  accountCount: number;
  pendingIn: number;
  forecastBalance: number;
  recentIn: number;
  recentOut: number;
};

async function loadCashFlowSeries(tenantId: string, weeks = 12): Promise<CashFlowPoint[]> {
  try {
    const now = new Date();
    // Anchor to Monday of current week
    const monday = new Date(now);
    const dow = monday.getDay() || 7;
    monday.setDate(monday.getDate() - (dow - 1));
    monday.setHours(0, 0, 0, 0);

    const from = new Date(monday);
    from.setDate(from.getDate() - (weeks - 1) * 7);
    const fromStr = from.toISOString().slice(0, 10);

    const txs = await prisma.seTransaction.findMany({
      where: {
        tenantId,
        madeOn: { gte: fromStr },
        status: 'posted',
        duplicated: false,
      },
      select: { amount: true, madeOn: true },
    });

    if (txs.length === 0) return [];

    // Bucket transactions by week start (Monday)
    const buckets = new Map<string, { inflow: number; outflow: number }>();
    for (let i = 0; i < weeks; i++) {
      const ws = new Date(from);
      ws.setDate(ws.getDate() + i * 7);
      const key = ws.toISOString().slice(0, 10);
      buckets.set(key, { inflow: 0, outflow: 0 });
    }

    for (const tx of txs) {
      const txDate = new Date(tx.madeOn);
      const diffDays = Math.floor((txDate.getTime() - from.getTime()) / 86_400_000);
      if (diffDays < 0) continue;
      const weekIndex = Math.floor(diffDays / 7);
      if (weekIndex >= weeks) continue;

      const ws = new Date(from);
      ws.setDate(ws.getDate() + weekIndex * 7);
      const key = ws.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;

      const amt = Number(tx.amount);
      if (amt > 0) bucket.inflow += amt;
      else bucket.outflow += Math.abs(amt);
    }

    const points: CashFlowPoint[] = [];
    let i = 0;
    for (const [key, bucket] of buckets) {
      const d = new Date(key);
      const label =
        i === weeks - 1
          ? 'Esta'
          : `${d.getDate()}/${d.getMonth() + 1}`;
      points.push({
        label,
        inflow: Math.round(bucket.inflow * 100) / 100,
        outflow: Math.round(bucket.outflow * 100) / 100,
        net: Math.round((bucket.inflow - bucket.outflow) * 100) / 100,
      });
      i++;
    }
    return points;
  } catch {
    return [];
  }
}

async function loadCashForecast(tenantId: string): Promise<CashForecast | null> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const [accounts, txStats] = await Promise.all([
      prisma.seAccount.findMany({
        where: { tenantId, status: 'active' },
        select: { balance: true },
      }),
      prisma.seTransaction.findMany({
        where: { tenantId, madeOn: { gte: thirtyDaysAgo }, status: 'posted', duplicated: false },
        select: { amount: true },
      }),
    ]);
    if (accounts.length === 0) return null;
    const currentBalance = Math.round(accounts.reduce((s, a) => s + Number(a.balance), 0) * 100) / 100;
    let recentIn = 0, recentOut = 0;
    for (const tx of txStats) {
      const amt = Number(tx.amount);
      if (amt > 0) recentIn += amt; else recentOut += Math.abs(amt);
    }
    return {
      currentBalance,
      accountCount: accounts.length,
      pendingIn: 0,     // filled in after analytics load
      forecastBalance: currentBalance,
      recentIn: Math.round(recentIn * 100) / 100,
      recentOut: Math.round(recentOut * 100) / 100,
    };
  } catch {
    return null;
  }
}

async function DashboardContent() {
  let kpis: KpiCard[] = [];
  let chartData: MonthlyPoint[] = [];
  let verifactu: VerifactuStats | null = null;
  let accountingPnL: HoldedAccountingPnL | null = null;
  let verifactuSignal: IsaakVerifactuSignal | null = null;
  let cashForecast: CashForecast | null = null;
  let cashFlow: CashFlowPoint[] = [];

  try {
    const session = await getHoldedSession();
    if (session?.tenantId && session.userId) {
      const ctx = await loadIsaakBusinessContext(
        {
          tenantId: session.tenantId,
          userId: session.userId,
          name: session.name,
          email: session.email,
        },
        { includeSnapshot: true }
      );
      const a = ctx.holded.analytics;
      const snapshot = ctx.holded.snapshot;
      accountingPnL = a?.accountingPnL ?? null;

      if (a) {
        const vatEstimate = a.quarterSales > 0 ? a.quarterSales * 0.21 : null;
        kpis = [
          {
            icon: TrendingUp,
            label: 'Facturado este mes',
            value: fmt(a.monthSales),
            sub: a.monthSales > 0 ? 'ventas confirmadas' : 'sin datos aún',
            color: 'text-[#2361d8]',
            bg: 'bg-[#2361d8]/10',
          },
          {
            icon: TrendingDown,
            label: 'Gastos este mes',
            value: fmt(a.monthExpenses),
            sub: a.monthExpenses !== null ? 'gastos detectados' : 'sin señal de gastos',
            color: 'text-slate-500',
            bg: 'bg-slate-100',
          },
          {
            icon: Clock,
            label: 'Pendiente de cobro',
            value: fmt(a.pendingCollectionsAmount),
            sub:
              a.pendingCollectionsCount > 0
                ? `${a.pendingCollectionsCount} factura${a.pendingCollectionsCount > 1 ? 's' : ''} pendiente${a.pendingCollectionsCount > 1 ? 's' : ''}`
                : 'todo cobrado',
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            icon: BarChart3,
            label: 'IVA estimado trimestre',
            value: fmt(vatEstimate),
            sub: vatEstimate !== null ? 'aprox. 21% s/ ventas trim.' : 'sin datos de ventas',
            color: 'text-violet-600',
            bg: 'bg-violet-50',
          },
        ];
      }

      if (snapshot) {
        chartData = buildMonthlyChart(snapshot);
      }

      // Cash forecast — real bank balance + pending collections
      const forecast = await loadCashForecast(session.tenantId);
      if (forecast) {
        const pendingIn = a?.pendingCollectionsAmount ?? 0;
        forecast.pendingIn = pendingIn;
        forecast.forecastBalance = Math.round((forecast.currentBalance + pendingIn) * 100) / 100;
        cashForecast = forecast;
      }

      // Cash flow series — weekly inflow/outflow (last 12 weeks)
      cashFlow = await loadCashFlowSeries(session.tenantId);

      // Verifactu Holded signal + local stats
      const wsSignals = await loadIsaakWorkspaceSignals({
        tenantId: session.tenantId,
        context: ctx,
      }).catch(() => null);
      verifactuSignal = wsSignals?.verifactu ?? null;

      const [issued, drafts, errors] = await Promise.all([
        prisma.invoice.count({
          where: {
            tenantId: session.tenantId,
            verifactuStatus: { in: ['validated', 'accepted'] },
          },
        }),
        prisma.invoice.count({
          where: { tenantId: session.tenantId, status: 'draft' },
        }),
        prisma.invoice.count({
          where: { tenantId: session.tenantId, verifactuStatus: 'error' },
        }),
      ]).catch(() => [0, 0, 0]);
      verifactu = { issued, drafts, errors };
    }
  } catch {
    // fail gracefully — show placeholder cards
  }

  const displayKpis =
    kpis.length > 0
      ? kpis
      : ([
          {
            icon: TrendingUp,
            label: 'Facturado este mes',
            value: '—',
            sub: 'Conecta tu ERP para ver datos',
            color: 'text-[#2361d8]',
            bg: 'bg-[#2361d8]/10',
          },
          {
            icon: TrendingDown,
            label: 'Gastos este mes',
            value: '—',
            sub: 'Pregunta a Isaak →',
            color: 'text-slate-500',
            bg: 'bg-slate-100',
          },
          {
            icon: Clock,
            label: 'Pendiente de cobro',
            value: '—',
            sub: 'Pregunta a Isaak →',
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            icon: BarChart3,
            label: 'IVA estimado trimestre',
            value: '—',
            sub: 'Pregunta a Isaak →',
            color: 'text-violet-600',
            bg: 'bg-violet-50',
          },
        ] as KpiCard[]);

  const hasChart =
    chartData.length > 0 && chartData.some((d) => d.sales > 0 || (d.expenses ?? 0) > 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 px-5 py-4 xl:grid-cols-4">
        {displayKpis.map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div
              className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}
            >
              <Icon size={16} className={color} />
            </div>
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
            <p
              className={`mt-0.5 text-lg font-bold ${value === '—' ? 'text-slate-300' : 'text-slate-800'}`}
            >
              {value}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Cash Forecast Widget ─────────────────────────────────────────── */}
      {cashForecast ? (
        <div className="mx-5 mb-3 rounded-xl border border-[#2361d8]/20 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark size={13} className="text-[#2361d8]" />
            <p className="text-[11px] font-semibold text-slate-500">
              Tesorería real · {cashForecast.accountCount} cuenta{cashForecast.accountCount !== 1 ? 's' : ''} bancaria{cashForecast.accountCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Saldo actual</p>
              <p className="text-[15px] font-bold text-slate-800">
                {fmt(cashForecast.currentBalance)}
              </p>
            </div>
            {cashForecast.pendingIn > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Cobros pendientes</p>
                <p className="text-[15px] font-bold text-emerald-600">
                  +{fmt(cashForecast.pendingIn)}
                </p>
              </div>
            )}
            {cashForecast.pendingIn > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Previsión 30d</p>
                <p className={`text-[15px] font-bold ${cashForecast.forecastBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {fmt(cashForecast.forecastBalance)}
                </p>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 border-t border-slate-100 pt-2">
            <span className="text-[10px] text-slate-400">Últimos 30 días:</span>
            <span className="text-[10px] text-emerald-600">↑ {fmt(cashForecast.recentIn)} entradas</span>
            <span className="text-[10px] text-rose-500">↓ {fmt(cashForecast.recentOut)} salidas</span>
          </div>
        </div>
      ) : (
        <div className="mx-5 mb-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Landmark size={13} className="text-slate-400" />
            <p className="text-[11px] text-slate-400">
              Conecta tu banco para ver tu tesorería real y previsión de liquidez →{' '}
              <a href="/banking" className="font-medium text-[#2361d8] hover:underline">
                Workspace &rsaquo; Banca
              </a>
            </p>
          </div>
        </div>
      )}

      {/* ── Cash Flow Chart (real banking data) ──────────────────────────── */}
      {cashFlow.length > 0 &&
        cashFlow.some((p) => p.inflow > 0 || p.outflow > 0) && (
          <div className="mx-5 mb-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-semibold text-slate-500">Cash flow semanal</p>
              <p className="text-[10px] text-slate-400">Últimas 12 semanas · datos bancarios</p>
            </div>
            <CashFlowChart data={cashFlow} />
          </div>
        )}

      {verifactuSignal?.checked && verifactuSignal.invoicesWithoutUuid > 0 && (
        <div className="mx-5 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-[12px] font-semibold text-amber-800">
                {verifactuSignal.invoicesWithoutUuid} factura
                {verifactuSignal.invoicesWithoutUuid > 1 ? 's' : ''} sin UUID Verifactu
              </p>
              <p className="mt-0.5 text-[11px] text-amber-700">
                De las últimas {verifactuSignal.invoicesChecked} facturas revisadas (90 días),{' '}
                {verifactuSignal.invoicesWithoutUuid} no tienen UUID Verifactu. El RD 1007/2023
                obliga a registrar todas las facturas. Pregunta a Isaak para saber cómo resolverlo.
              </p>
            </div>
          </div>
        </div>
      )}

      {accountingPnL && accountingPnL.entriesProcessed > 0 && (
        <div className="mx-5 mb-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <Calculator size={13} className="text-[#2361d8]" />
            <p className="text-[11px] font-semibold text-slate-500">
              Resultado contable {accountingPnL.year} (libro diario · YTD)
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Ingresos</p>
              <p className="text-[14px] font-semibold text-emerald-600">
                {fmt(accountingPnL.income)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Gastos</p>
              <p className="text-[14px] font-semibold text-slate-700">
                {fmt(accountingPnL.expenses)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Resultado</p>
              <p
                className={`text-[14px] font-semibold ${
                  accountingPnL.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {fmt(accountingPnL.grossProfit)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Margen</p>
              <p
                className={`text-[14px] font-semibold ${
                  (accountingPnL.margin ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {accountingPnL.margin !== null ? `${accountingPnL.margin}%` : '—'}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Agregado desde {accountingPnL.entriesProcessed} asientos del libro diario (cuentas PGC
            7xx ingresos · 6xx gastos).
          </p>
        </div>
      )}

      {verifactu !== null && verifactu.issued + verifactu.drafts + verifactu.errors > 0 && (
        <div className="mx-5 mb-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <FileCheck size={13} className="text-emerald-500" />
            <p className="text-[11px] font-semibold text-slate-500">Verifactu (AEAT)</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            <span className="flex items-center gap-1.5 text-[12px] text-slate-700">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              <strong>{verifactu.issued}</strong> emitidas
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-slate-700">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
              <strong>{verifactu.drafts}</strong> borrador{verifactu.drafts !== 1 ? 'es' : ''}
            </span>
            {verifactu.errors > 0 && (
              <span className="flex items-center gap-1.5 text-[12px] text-rose-600">
                <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
                <strong>{verifactu.errors}</strong> con error
              </span>
            )}
          </div>
        </div>
      )}

      {hasChart && (
        <div className="mx-5 mb-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-[12px] font-semibold text-slate-500">Ventas últimos 6 meses</p>
          <ResumenChart data={chartData} />
        </div>
      )}
    </>
  );
}

export default function ResumenPage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <h1 className="text-[16px] font-semibold text-[#011c67]">Resumen de tu empresa</h1>
        <p className="text-[12px] text-slate-500">
          Estado general · datos en tiempo real desde Holded
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 px-5 py-4 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-slate-100 bg-slate-50"
              />
            ))}
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}
