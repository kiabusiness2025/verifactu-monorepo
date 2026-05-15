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
type OverviewResponse = {
  timeline: TimelinePoint[];
  errors24h: unknown[];
  topTools: unknown[];
  recentEvents: unknown[];
};

const CHANNELS: ChannelKey[] = ['claude', 'chatgpt', 'dashboard', 'mobile'];

const CHANNEL_LABEL: Record<ChannelKey, string> = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  dashboard: 'Dashboard',
  mobile: 'Mobile',
};

const CHANNEL_STYLE: Record<ChannelKey, { card: string; bar: string; dot: string }> = {
  claude: { card: 'border-amber-200 bg-amber-50', bar: 'bg-amber-400', dot: 'bg-amber-400' },
  chatgpt: {
    card: 'border-emerald-200 bg-emerald-50',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  dashboard: { card: 'border-slate-200 bg-slate-50', bar: 'bg-slate-400', dot: 'bg-slate-400' },
  mobile: { card: 'border-sky-200 bg-sky-50', bar: 'bg-sky-500', dot: 'bg-sky-500' },
};

function formatDay(value: string) {
  try {
    const d = new Date(value);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  } catch {
    return value;
  }
}

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

  // Last 7 days timeline, one bucket per day, total across all channels
  const last7Days = useMemo(() => {
    if (!overview?.timeline.length) return [];
    const byDay = new Map<string, number>();
    for (const pt of overview.timeline) {
      byDay.set(pt.bucket, (byDay.get(pt.bucket) ?? 0) + pt.count);
    }
    const sorted = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7);
    return sorted.map(([bucket, total]) => ({ bucket, total }));
  }, [overview]);

  const maxDay = useMemo(() => Math.max(...last7Days.map((d) => d.total), 1), [last7Days]);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
        No se pudo cargar el widget de conectores: {error}
      </div>
    );
  }

  const totals = summary?.totals;
  const byChannel = summary?.byChannel;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Conectores Holded</h2>
          {totals && !loading && (
            <p className="mt-0.5 text-xs text-slate-500">
              {totals.connected} activas ·{' '}
              {totals.errors24h > 0 ? `${totals.errors24h} errores 24h · ` : ''}
              {totals.activeLast24h} activas 24h
            </p>
          )}
        </div>
        <Link
          href="/connectors/overview"
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ver detalle →
        </Link>
      </div>

      <div className="p-5 space-y-5">
        {/* Channel cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CHANNELS.map((ch) => {
            const stats = byChannel?.[ch];
            const style = CHANNEL_STYLE[ch];
            return (
              <div key={ch} className={`rounded-xl border px-3 py-2.5 ${style.card}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    {CHANNEL_LABEL[ch]}
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular-nums text-slate-900">
                    {loading || !stats ? '—' : stats.total}
                  </span>
                  <span className="text-[10px] text-slate-400">total</span>
                </div>
                {stats && (
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {stats.connected} ok{stats.errors > 0 ? ` · ${stats.errors} err` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mini 7-day bar chart */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Nuevas conexiones — últimos 7 días
            </span>
            {totals && (
              <span className="text-[10px] text-slate-400">Activas 7d: {totals.activeLast7d}</span>
            )}
          </div>
          {loading ? (
            <div className="flex h-14 items-end gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 animate-pulse rounded-t bg-slate-100"
                  style={{ height: `${30 + Math.random() * 50}%` }}
                />
              ))}
            </div>
          ) : last7Days.length === 0 ? (
            <p className="text-xs text-slate-400">Sin conexiones en los últimos 7 días.</p>
          ) : (
            <div className="flex h-14 items-end gap-1">
              {last7Days.map(({ bucket, total }) => {
                const heightPct = Math.max((total / maxDay) * 100, total > 0 ? 8 : 3);
                return (
                  <div
                    key={bucket}
                    className="group flex flex-1 flex-col items-center justify-end"
                    title={`${formatDay(bucket)}: ${total} nuevas`}
                  >
                    <div
                      className="w-full rounded-t bg-[#2361d8]/20 transition-colors group-hover:bg-[#2361d8]/40"
                      style={{ height: `${heightPct}%` }}
                    />
                    <div className="mt-1 text-[9px] text-slate-400">{formatDay(bucket)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Error alert strip */}
        {!loading && totals && totals.errors24h > 0 && (
          <Link
            href="/connectors/overview"
            className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 hover:bg-rose-100 transition-colors"
          >
            <span>
              <strong>{totals.errors24h}</strong> conexión{totals.errors24h > 1 ? 'es' : ''} con
              error en las últimas 24h
            </span>
            <span className="text-rose-400">→</span>
          </Link>
        )}
      </div>
    </section>
  );
}
