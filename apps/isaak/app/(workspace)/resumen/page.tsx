import type { Metadata } from 'next';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { Suspense } from 'react';
import { getHoldedSession } from '@/app/lib/holded-session';
import { loadIsaakBusinessContext } from '@/app/lib/isaak-business-context';
import { buildRangeSummary } from '@/app/lib/holded-analytics';
import IsaakChatSection from '../components/IsaakChatSection';
import ResumenChart, { type MonthlyPoint } from './components/ResumenChart';

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

async function DashboardContent() {
  let kpis: KpiCard[] = [];
  let chartData: MonthlyPoint[] = [];

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
            sub: 'Conecta Holded para ver datos',
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
    <div className="flex h-full flex-col">
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

      <div className="flex-1 overflow-hidden border-t border-slate-100">
        <IsaakChatSection
          context="resumen"
          welcomeTitle="¿Qué quieres analizar hoy?"
          welcomeSubtitle="Haz clic en una pregunta rápida o escribe tu consulta."
        />
      </div>
    </div>
  );
}
