// V1.4.2 — Dashboard admin de métricas del chat.
//
// Consume GET /api/isaak/admin/metrics?days=N (gating por ADMIN_EMAILS).
// Muestra KPIs principales, timeseries de uso diario y rankings de
// modelo, tools y rutas del classifier.
//
// El layout (workspace) ya valida sesión y aplica force-dynamic.

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CircleDollarSign,
  Clock,
  Hash,
  Loader2,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type MetricsResponse = {
  period: { days: number; since: string };
  totals: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costEur: number;
    judgeInvocations: number;
    judgeBlocks: number;
    fallbacks: number;
    clarifications: number;
  };
  latency: {
    avgMs: number;
    firstTokenAvgMs: number;
    p50Ms: number;
    p95Ms: number;
  };
  byDay: Array<{
    day: string;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costEur: number;
    avgLatencyMs: number;
  }>;
  byModel: Array<{ model: string; count: number }>;
  byRoutedTo: Array<{ routedTo: string; count: number }>;
  topTools: Array<{ toolName: string; count: number }>;
};

const PERIOD_OPTIONS = [
  { value: 1, label: '24h' },
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
];

function fmtNumber(n: number) {
  return new Intl.NumberFormat('es-ES').format(n);
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(n);
}
function fmtMs(n: number) {
  if (n < 1000) return `${n} ms`;
  return `${(n / 1000).toFixed(1)} s`;
}

export default function AdminMetricsPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (period: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/isaak/admin/metrics?days=${period}`, {
        credentials: 'include',
      });
      if (res.status === 403) {
        setError('Necesitas acceso de administrador para ver esta página.');
        return;
      }
      if (!res.ok) {
        setError(`Error ${res.status}.`);
        return;
      }
      setData((await res.json()) as MetricsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8] text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Métricas del chat</h1>
            <p className="text-sm text-slate-500">
              KPIs agregados sobre IsaakChatMetric — solo accesible a administradores.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-xs">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              className={`rounded-full px-3 py-1 font-semibold transition ${
                days === opt.value
                  ? 'bg-[#2361d8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="mt-10 flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#2361d8]" />
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="mt-6 space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi
              icon={<Hash className="h-4 w-4" />}
              label="Mensajes"
              value={fmtNumber(data.totals.requests)}
              sub={`${fmtNumber(data.totals.clarifications)} aclaraciones`}
            />
            <Kpi
              icon={<CircleDollarSign className="h-4 w-4" />}
              label="Coste IA"
              value={fmtMoney(data.totals.costEur)}
              sub={`${fmtNumber(
                data.totals.inputTokens + data.totals.outputTokens,
              )} tokens`}
              color="amber"
            />
            <Kpi
              icon={<Clock className="h-4 w-4" />}
              label="Latencia avg"
              value={fmtMs(data.latency.avgMs)}
              sub={`p95 ${fmtMs(data.latency.p95Ms)}`}
              color="blue"
            />
            <Kpi
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Fallbacks"
              value={fmtNumber(data.totals.fallbacks)}
              sub={`${fmtNumber(data.totals.judgeBlocks)} judge blocks`}
              color={data.totals.fallbacks > 0 ? 'red' : 'green'}
            />
          </div>

          {/* Daily timeseries */}
          {data.byDay.length > 0 && (
            <Card title="Mensajes por día" icon={<BarChart3 className="h-4 w-4" />}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.byDay}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Line
                    dataKey="requests"
                    type="monotone"
                    stroke="#2361d8"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Two columns: routedTo + byModel */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Routing del classifier" icon={<Brain className="h-4 w-4" />}>
              <RankingList items={data.byRoutedTo.map((r) => ({ name: r.routedTo, count: r.count }))} />
            </Card>
            <Card title="Modelos usados" icon={<Sparkles className="h-4 w-4" />}>
              <RankingList items={data.byModel.map((r) => ({ name: r.model, count: r.count }))} />
            </Card>
          </div>

          {/* Tools */}
          <Card title="Top tools invocadas" icon={<Wrench className="h-4 w-4" />}>
            {data.topTools.length === 0 ? (
              <p className="text-xs text-slate-500">
                No hay tools registradas en este periodo.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.min(360, 50 + data.topTools.length * 22)}>
                <BarChart
                  data={data.topTools}
                  layout="vertical"
                  margin={{ left: 60, right: 20, top: 10, bottom: 10 }}
                >
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    type="category"
                    dataKey="toolName"
                    tick={{ fontSize: 10, fill: '#0f172a' }}
                    width={170}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2361d8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <p className="text-center text-[11px] text-slate-400">
            Periodo: {data.period.days} días · desde {data.period.since.slice(0, 10)}
          </p>
        </div>
      )}
    </div>
  );
}

const KPI_COLORS = {
  blue: { bg: 'bg-[#2361d8]/10', text: 'text-[#2361d8]' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  red: { bg: 'bg-rose-50', text: 'text-rose-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
} as const;

function Kpi({
  icon,
  label,
  value,
  sub,
  color = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: keyof typeof KPI_COLORS;
}) {
  const c = KPI_COLORS[color];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${c.bg} ${c.text}`}>
        {icon}
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold text-[#011c67]">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-900">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function RankingList({ items }: { items: Array<{ name: string; count: number }> }) {
  if (items.length === 0) {
    return <p className="text-xs text-slate-500">Sin datos.</p>;
  }
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="space-y-1.5">
      {items.slice(0, 8).map((item) => {
        const pct = max > 0 ? (item.count / max) * 100 : 0;
        return (
          <li key={item.name} className="text-xs">
            <div className="mb-0.5 flex items-center justify-between">
              <span className="truncate font-medium text-slate-700">{item.name}</span>
              <span className="ml-2 font-semibold tabular-nums text-slate-900">
                {fmtNumber(item.count)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#2361d8]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
