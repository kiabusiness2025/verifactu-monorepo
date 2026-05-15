'use client';

import { adminGet } from '@/lib/adminApi';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ChannelKey = 'dashboard' | 'chatgpt' | 'mobile' | 'claude';

type SummaryResponse = {
  totals: {
    total: number;
    connected: number;
    errors: number;
    revoked: number;
    disconnected: number;
    errors24h: number;
    activeLast24h: number;
    activeLast7d: number;
  };
  byChannel: Record<
    ChannelKey,
    { total: number; connected: number; errors: number; revoked: number }
  >;
};

type TimelinePoint = { bucket: string; channelKey: string; count: number };
type TopToolEntry = { toolName: string; channel: string | null; calls: number; errors: number };
type OverviewResponse = {
  timeline: TimelinePoint[];
  errors24h: unknown[];
  topTools: TopToolEntry[];
  recentEvents: unknown[];
};

// ── Constantes de canales ────────────────────────────────────────────────────

const CHANNELS: ChannelKey[] = ['claude', 'chatgpt', 'dashboard', 'mobile'];

const CHANNEL_LABEL: Record<ChannelKey, string> = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  dashboard: 'Dashboard',
  mobile: 'Mobile',
};

const CHANNEL_COLOR = {
  claude: {
    bar: 'bg-amber-400',
    dot: 'bg-amber-400',
    badge: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  chatgpt: {
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  dashboard: {
    bar: 'bg-slate-400',
    dot: 'bg-slate-400',
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  mobile: { bar: 'bg-sky-400', dot: 'bg-sky-400', badge: 'border-sky-200 bg-sky-50 text-sky-800' },
} satisfies Record<ChannelKey, { bar: string; dot: string; badge: string }>;

// ── Mapa de alturas/anchos % como clases Tailwind estáticas ─────────────────
// (igual que connectors/overview/page.tsx; necesario para que el purger las genere)

const H_PCT: Record<number, string> = {
  0: 'h-[0%]',
  5: 'h-[5%]',
  10: 'h-[10%]',
  15: 'h-[15%]',
  20: 'h-[20%]',
  25: 'h-[25%]',
  30: 'h-[30%]',
  35: 'h-[35%]',
  40: 'h-[40%]',
  45: 'h-[45%]',
  50: 'h-[50%]',
  55: 'h-[55%]',
  60: 'h-[60%]',
  65: 'h-[65%]',
  70: 'h-[70%]',
  75: 'h-[75%]',
  80: 'h-[80%]',
  85: 'h-[85%]',
  90: 'h-[90%]',
  95: 'h-[95%]',
  100: 'h-[100%]',
};

const W_PCT: Record<number, string> = {
  0: 'w-[0%]',
  5: 'w-[5%]',
  10: 'w-[10%]',
  15: 'w-[15%]',
  20: 'w-[20%]',
  25: 'w-[25%]',
  30: 'w-[30%]',
  35: 'w-[35%]',
  40: 'w-[40%]',
  45: 'w-[45%]',
  50: 'w-[50%]',
  55: 'w-[55%]',
  60: 'w-[60%]',
  65: 'w-[65%]',
  70: 'w-[70%]',
  75: 'w-[75%]',
  80: 'w-[80%]',
  85: 'w-[85%]',
  90: 'w-[90%]',
  95: 'w-[95%]',
  100: 'w-[100%]',
};

function hPct(value: number): string {
  const step = Math.max(0, Math.min(100, Math.round(value / 5) * 5));
  return H_PCT[step] ?? 'h-[0%]';
}
function wPct(value: number): string {
  const step = Math.max(0, Math.min(100, Math.round(value / 5) * 5));
  return W_PCT[step] ?? 'w-[0%]';
}

// Alturas fijas para el skeleton (sin inline styles)
const SKELETON_HEIGHTS = [
  'h-10',
  'h-16',
  'h-8',
  'h-20',
  'h-12',
  'h-14',
  'h-8',
  'h-18',
  'h-6',
  'h-16',
  'h-12',
  'h-10',
  'h-14',
  'h-16',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDay(value: string) {
  try {
    return new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  } catch {
    return value;
  }
}

// ── Componente ───────────────────────────────────────────────────────────────

export function ConnectorsPanelWidget() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminGet<SummaryResponse>('/api/admin/connectors/summary'),
      adminGet<OverviewResponse>('/api/admin/connectors/overview'),
    ])
      .then(([s, o]) => {
        if (cancelled) return;
        setSummary(s);
        setOverview(o);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Últimos 14 días, agrupados por día → por canal
  const chartData = useMemo(() => {
    if (!overview?.timeline.length) return [];
    const byDay = new Map<string, Partial<Record<ChannelKey, number>>>();
    for (const pt of overview.timeline) {
      const ch = pt.channelKey as ChannelKey;
      const day = byDay.get(pt.bucket) ?? {};
      day[ch] = (day[ch] ?? 0) + pt.count;
      byDay.set(pt.bucket, day);
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([bucket, channels]) => ({
        bucket,
        channels,
        total: Object.values(channels).reduce((s, v) => s + v, 0),
      }));
  }, [overview]);

  const maxTotal = useMemo(() => Math.max(...chartData.map((d) => d.total), 1), [chartData]);

  // Top 4 tools (24h)
  const topTools = useMemo(() => (overview?.topTools ?? []).slice(0, 4), [overview]);
  const maxToolCalls = useMemo(() => Math.max(...topTools.map((t) => t.calls), 1), [topTools]);

  const totals = summary?.totals;
  const byChannel = summary?.byChannel;

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
        No se pudo cargar el widget de conectores: {error}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Actividad de conectores</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Nuevas conexiones por día · últimos 14 días
          </p>
        </div>
        <Link
          href="/connectors/overview"
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Ver detalle →
        </Link>
      </div>

      <div className="space-y-6 p-5">
        {/* Tarjetas por canal */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CHANNELS.map((ch) => {
            const stats = byChannel?.[ch];
            const color = CHANNEL_COLOR[ch];
            return (
              <div key={ch} className={`rounded-xl border px-3 py-2.5 ${color.badge}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    {CHANNEL_LABEL[ch]}
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tabular-nums text-slate-900">
                    {loading || !stats ? '—' : stats.total}
                  </span>
                  <span className="text-[10px] opacity-60">total</span>
                </div>
                {stats ? (
                  <div className="mt-0.5 text-[10px] opacity-75">
                    {stats.connected} activas
                    {stats.errors > 0 && (
                      <span className="ml-1 text-rose-600">· {stats.errors} err</span>
                    )}
                  </div>
                ) : (
                  <div className="mt-0.5 h-3 w-16 animate-pulse rounded bg-current opacity-20" />
                )}
              </div>
            );
          })}
        </div>

        {/* Gráfico de barras apiladas */}
        <div>
          {/* Leyenda */}
          <div className="mb-3 flex flex-wrap gap-3">
            {CHANNELS.map((ch) => (
              <span key={ch} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className={`h-2.5 w-2.5 rounded-sm ${CHANNEL_COLOR[ch].bar}`} />
                {CHANNEL_LABEL[ch]}
              </span>
            ))}
          </div>

          {/* Barras */}
          <div className="flex h-44 items-end gap-[3px]">
            {loading ? (
              SKELETON_HEIGHTS.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center justify-end">
                  <div className={`w-full animate-pulse rounded-t bg-slate-100 ${h}`} />
                  <div className="mt-1.5 h-2 w-6 animate-pulse rounded bg-slate-100" />
                </div>
              ))
            ) : chartData.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-xs text-slate-400">
                Sin conexiones en los últimos 14 días
              </div>
            ) : (
              chartData.map(({ bucket, channels, total }) => {
                const barHeightPct = Math.max((total / maxTotal) * 100, total > 0 ? 5 : 1);
                const tooltip =
                  `${formatDay(bucket)} · ${total} nueva${total !== 1 ? 's' : ''}\n` +
                  CHANNELS.filter((ch) => (channels[ch] ?? 0) > 0)
                    .map((ch) => `${CHANNEL_LABEL[ch]}: ${channels[ch]}`)
                    .join('  ');

                return (
                  <div
                    key={bucket}
                    className="group flex flex-1 flex-col items-stretch justify-end"
                    title={tooltip}
                  >
                    {/* Barra: altura proporcional al día de mayor actividad */}
                    <div
                      className={`w-full overflow-hidden rounded-t-sm transition-opacity group-hover:opacity-75 ${hPct(barHeightPct)}`}
                    >
                      {/* Segmentos apilados: cada canal ocupa su % de la barra */}
                      <div className="flex h-full flex-col-reverse">
                        {CHANNELS.filter((ch) => (channels[ch] ?? 0) > 0).map((ch) => {
                          const segPct = total > 0 ? ((channels[ch] ?? 0) / total) * 100 : 0;
                          return (
                            <div
                              key={ch}
                              className={`w-full ${CHANNEL_COLOR[ch].bar} ${hPct(segPct)}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-1.5 text-center text-[8px] text-slate-400">
                      {formatDay(bucket)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Stats row */}
        {totals && !loading && (
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
            {[
              { label: 'Activas ahora', value: totals.connected, alert: false },
              { label: 'Activas 24h', value: totals.activeLast24h, alert: false },
              { label: 'Activas 7d', value: totals.activeLast7d, alert: false },
              { label: 'Errores 24h', value: totals.errors24h, alert: totals.errors24h > 0 },
            ].map(({ label, value, alert }) => (
              <div key={label} className="text-center">
                <p
                  className={`text-lg font-bold tabular-nums ${alert ? 'text-rose-600' : 'text-slate-800'}`}
                >
                  {value}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Top tools 24h */}
        {!loading && topTools.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Top tools MCP · últimas 24h
            </p>
            <div className="space-y-2">
              {topTools.map((tool) => {
                const barPct = (tool.calls / maxToolCalls) * 100;
                const chColor =
                  tool.channel && tool.channel in CHANNEL_COLOR
                    ? CHANNEL_COLOR[tool.channel as ChannelKey].bar
                    : 'bg-slate-300';
                return (
                  <div key={`${tool.toolName}-${tool.channel}`} className="flex items-center gap-2">
                    <span className="w-36 shrink-0 truncate font-mono text-[11px] text-slate-600">
                      {tool.toolName}
                    </span>
                    <div className="relative h-4 flex-1 overflow-hidden rounded bg-slate-100">
                      <div className={`h-full rounded transition-all ${chColor} ${wPct(barPct)}`} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-slate-500">
                      {tool.calls}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error alert */}
        {!loading && totals && totals.errors24h > 0 && (
          <Link
            href="/connectors/overview"
            className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 transition-colors hover:bg-rose-100"
          >
            <span>
              <strong>{totals.errors24h}</strong> conexión{totals.errors24h > 1 ? 'es' : ''} con
              error en las últimas 24h — ver detalle
            </span>
            <span className="shrink-0 text-rose-400">→</span>
          </Link>
        )}
      </div>
    </section>
  );
}
