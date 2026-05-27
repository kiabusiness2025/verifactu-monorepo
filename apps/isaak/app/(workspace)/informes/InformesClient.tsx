'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Download, TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';

type PLSummary = {
  invoiceCount: number;
  expenseCount: number;
  grossRevenue: number;
  netRevenue: number;
  totalTaxCharged: number;
  totalExpenses: number;
  grossProfit: number;
  margin: number;
  cashReceived: number;
};

type MonthlyRow = { month: string; revenue: number; expenses: number; payments: number };

type PLData = {
  period: { year: number; month: number | null };
  summary: PLSummary;
  expensesByCategory: Record<string, number>;
  monthly: MonthlyRow[];
  truncated?: boolean;
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtMonth(key: string) {
  const [y, m] = key.split('-');
  return new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit' }).format(
    new Date(Number(y), Number(m) - 1, 1)
  );
}

function KpiCard({
  label,
  value,
  sub,
  color = 'blue',
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: 'blue' | 'green' | 'red' | 'amber';
  icon: React.ElementType;
}) {
  const colors = {
    blue: 'bg-[#2361d8]/8 text-[#2361d8]',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-[#011c67]">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

export default function InformesClient({ year: initYear }: { year: number }) {
  const [year, setYear] = useState(initYear);
  const [month, setMonth] = useState<number | null>(null);
  const [data, setData] = useState<PLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noHolded, setNoHolded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNoHolded(false);
    const url = month
      ? `/api/reports/pl?year=${year}&month=${month}`
      : `/api/reports/pl?year=${year}`;
    fetch(url)
      .then(async (r) => {
        const d = await r.json();
        if (r.status === 422) {
          setNoHolded(true);
          return;
        }
        setData(d.ok ? d : null);
      })
      .finally(() => setLoading(false));
  }, [year, month]);

  const s = data?.summary;

  // Bar chart max
  const maxBar = data
    ? Math.max(...data.monthly.map((r) => Math.max(r.revenue, r.expenses)), 1)
    : 1;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-[#fafbff] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2361d8]/10">
              <BarChart3 size={16} className="text-[#2361d8]" />
            </div>
            <div>
              <h1 className="text-[16px] font-semibold text-[#011c67]">Informes</h1>
              <p className="text-[12px] text-slate-500">Cuenta de resultados y flujo de caja</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Year picker */}
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none"
              aria-label="Seleccionar año"
            >
              {[initYear - 1, initYear].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {/* Month picker */}
            <select
              value={month ?? ''}
              onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none"
              aria-label="Seleccionar mes"
            >
              <option value="">Todo el año</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(
                    new Date(year, m - 1, 1)
                  )}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">
            Calculando…
          </div>
        ) : noHolded ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm text-slate-500">
              Conecta tu ERP para ver la cuenta de resultados en tiempo real.
            </p>
            <a
              href="/settings/connections"
              className="rounded-lg bg-[#2361d8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a4fc4]"
            >
              Conectar tu ERP
            </a>
          </div>
        ) : !s ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">
            Sin datos para el período seleccionado.
          </div>
        ) : (
          <>
            {/* Truncated warning */}
            {data!.truncated && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Hay más de 500 documentos en el período. Los totales pueden ser incompletos.
              </div>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard
                label="Ingresos brutos"
                value={fmt(s.grossRevenue)}
                sub={`${s.invoiceCount} facturas`}
                color="blue"
                icon={TrendingUp}
              />
              <KpiCard
                label="Gastos"
                value={fmt(s.totalExpenses)}
                sub={`${s.expenseCount} registros`}
                color="red"
                icon={TrendingDown}
              />
              <KpiCard
                label="Beneficio"
                value={fmt(s.grossProfit)}
                sub={`Margen ${s.margin}%`}
                color={s.grossProfit >= 0 ? 'green' : 'red'}
                icon={ArrowRight}
              />
              <KpiCard
                label="Cobros reales"
                value={fmt(s.cashReceived)}
                sub="pagos recibidos"
                color="amber"
                icon={Wallet}
              />
            </div>

            {/* Monthly chart */}
            {data!.monthly.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-sm font-semibold text-[#011c67]">Evolución mensual</h2>
                <div className="flex items-end gap-1.5">
                  {data!.monthly.map((row) => (
                    <div key={row.month} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full flex-col items-center gap-0.5">
                        <div
                          className="w-full rounded-t bg-[#2361d8]/80"
                          style={{
                            height: `${Math.max(4, (row.revenue / maxBar) * 80)}px`,
                          }}
                          title={`Ingresos: ${fmt(row.revenue)}`}
                        />
                        <div
                          className="w-full rounded-t bg-rose-400/70"
                          style={{
                            height: `${Math.max(2, (row.expenses / maxBar) * 80)}px`,
                          }}
                          title={`Gastos: ${fmt(row.expenses)}`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">{fmtMonth(row.month)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-[#2361d8]/80" /> Ingresos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-rose-400/70" /> Gastos
                  </span>
                </div>
              </div>
            )}

            {/* Expenses by category */}
            {Object.keys(data!.expensesByCategory).length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-sm font-semibold text-[#011c67]">Gastos por categoría</h2>
                <div className="space-y-2">
                  {Object.entries(data!.expensesByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amount]) => {
                      const pct =
                        s.totalExpenses > 0 ? Math.round((amount / s.totalExpenses) * 100) : 0;
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <div className="w-28 truncate text-xs capitalize text-slate-600">
                            {cat}
                          </div>
                          <div className="flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-[#2361d8]/60"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="w-20 text-right text-xs font-semibold text-slate-700">
                            {fmt(amount)}
                          </div>
                          <div className="w-8 text-right text-xs text-slate-400">{pct}%</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Tax summary */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h2 className="mb-3 text-sm font-semibold text-[#011c67]">Resumen fiscal</h2>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <div className="text-xs text-slate-500">IVA repercutido (emitido)</div>
                  <div className="mt-0.5 font-semibold text-slate-800">
                    {fmt(s.totalTaxCharged)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Base imponible neta</div>
                  <div className="mt-0.5 font-semibold text-slate-800">{fmt(s.netRevenue)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Margen neto s/ingresos</div>
                  <div className="mt-0.5 font-semibold text-slate-800">{s.margin}%</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
