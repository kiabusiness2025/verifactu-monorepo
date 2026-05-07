'use client';

/**
 * F6.2a — Mini-cards KPI globales del conector Holded.
 *
 * Render: 4 tarjetas con totales y un breakdown por canal. Se sirve desde
 * /admin/tenants (header) y desde /admin/connectors/overview (en la cabecera
 * de la pagina dedicada).
 *
 * Datos: GET /api/admin/connectors/summary.
 */

import { adminGet } from '@/lib/adminApi';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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

const CHANNEL_LABEL: Record<ChannelKey, string> = {
  dashboard: 'Dashboard',
  chatgpt: 'ChatGPT',
  mobile: 'ChatGPT mobile',
  claude: 'Claude Desktop',
};

const CHANNEL_ACCENT: Record<ChannelKey, string> = {
  dashboard: 'bg-slate-50 text-slate-700 border-slate-200',
  chatgpt: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mobile: 'bg-sky-50 text-sky-700 border-sky-200',
  claude: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function HoldedConnectorsKpiCards({
  showOverviewLink = true,
}: {
  showOverviewLink?: boolean;
}) {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminGet<SummaryResponse>('/api/admin/connectors/summary')
      .then((response) => {
        if (cancelled) return;
        setData(response);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar metricas');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
        No se pudieron cargar las metricas del conector: {error}
      </div>
    );
  }

  const totals = data?.totals;
  const byChannel = data?.byChannel;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Conectores Holded · resumen</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Estado agregado de las conexiones MCP/Holded en todos los canales.
          </p>
        </div>
        {showOverviewLink ? (
          <Link
            href="/connectors/overview"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver overview
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Total conexiones"
          value={totals?.total}
          loading={loading}
          hint={
            totals
              ? `${totals.connected} activas · ${totals.disconnected} desconectadas`
              : undefined
          }
        />
        <KpiCard
          label="Conectadas"
          value={totals?.connected}
          loading={loading}
          hint={totals ? `Activas 24h: ${totals.activeLast24h}` : undefined}
          accent="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
        <KpiCard
          label="Errores 24h"
          value={totals?.errors24h}
          loading={loading}
          hint={totals ? `Total en error: ${totals.errors}` : undefined}
          accent="bg-amber-50 text-amber-700 border-amber-200"
        />
        <KpiCard
          label="Revocadas"
          value={totals?.revoked}
          loading={loading}
          hint={totals ? `Activas 7d: ${totals.activeLast7d}` : undefined}
          accent="bg-rose-50 text-rose-700 border-rose-200"
        />
      </div>

      {byChannel ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(byChannel) as ChannelKey[]).map((channel) => {
            const stats = byChannel[channel];
            return (
              <div
                key={channel}
                className={`rounded-2xl border ${CHANNEL_ACCENT[channel]} px-3 py-2 text-xs`}
              >
                <div className="font-semibold">{CHANNEL_LABEL[channel]}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-semibold tabular-nums">{stats.total}</span>
                  <span className="text-[10px] uppercase tracking-wide opacity-75">total</span>
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wide opacity-75">
                  {stats.connected} ok · {stats.errors} err · {stats.revoked} rev
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function KpiCard({
  label,
  value,
  hint,
  loading,
  accent = 'bg-white text-slate-900 border-slate-200',
}: {
  label: string;
  value: number | undefined;
  hint?: string;
  loading?: boolean;
  accent?: string;
}) {
  return (
    <div className={`rounded-2xl border ${accent} px-4 py-3 shadow-soft`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-75">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">
          {loading || value === undefined ? '—' : value}
        </span>
      </div>
      {hint ? <div className="mt-1 text-[11px] opacity-75">{hint}</div> : null}
    </div>
  );
}
