'use client';

/**
 * F6.2b — Pagina dedicada /admin/connectors/overview.
 *
 * Capas de informacion:
 *   - HoldedConnectorsKpiCards (compartido con /admin/tenants index)
 *   - Timeline 30d (barras apiladas por canal)
 *   - Tabla de errores 24h
 *   - Top tools llamadas en las ultimas 24h
 *   - Stream de eventos recientes (audit log mixto)
 *
 * Datos: GET /api/admin/connectors/overview.
 */

import { HoldedConnectorsKpiCards } from '@/components/admin/HoldedConnectorsKpiCards';
import { adminGet } from '@/lib/adminApi';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ChannelKey = 'dashboard' | 'chatgpt' | 'mobile' | 'claude' | string;

type TimelinePoint = {
  bucket: string;
  channelKey: ChannelKey;
  count: number;
};

type ErrorEntry = {
  connectionId: string;
  tenantId: string;
  tenantLegalName: string | null;
  channelKey: ChannelKey;
  lastError: string | null;
  updatedAt: string | null;
};

type TopToolEntry = {
  toolName: string;
  channel: string | null;
  calls: number;
  errors: number;
  lastUsedAt: string | null;
};

type RecentEventEntry = {
  source: string;
  occurredAt: string;
  tenantId: string;
  tenantLegalName: string | null;
  action: string;
  channel: string | null;
  detail: string | null;
  status: string | null;
};

type OverviewResponse = {
  timeline: TimelinePoint[];
  errors24h: ErrorEntry[];
  topTools: TopToolEntry[];
  recentEvents: RecentEventEntry[];
};

const CHANNEL_LABEL: Record<string, string> = {
  dashboard: 'Dashboard',
  chatgpt: 'ChatGPT',
  mobile: 'Mobile',
  claude: 'Claude',
};

const CHANNEL_BAR: Record<string, string> = {
  dashboard: 'bg-slate-400',
  chatgpt: 'bg-emerald-500',
  mobile: 'bg-sky-500',
  claude: 'bg-amber-500',
};

const CHANNEL_BADGE: Record<string, string> = {
  dashboard: 'bg-slate-100 text-slate-700 border-slate-200',
  chatgpt: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mobile: 'bg-sky-50 text-sky-700 border-sky-200',
  claude: 'bg-amber-50 text-amber-700 border-amber-200',
};

const HEIGHT_PCT_CLASSES: Record<number, string> = {
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

function pctHeightClass(value: number): string {
  const step = Math.max(0, Math.min(100, Math.round(value / 5) * 5));
  return HEIGHT_PCT_CLASSES[step] ?? HEIGHT_PCT_CLASSES[0];
}

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

function formatDay(value: string) {
  try {
    const d = new Date(value);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  } catch {
    return value;
  }
}

export default function ConnectorsOverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminGet<OverviewResponse>('/api/admin/connectors/overview');
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const timelineByDay = useMemo(() => {
    if (!data)
      return [] as Array<{ bucket: string; channels: Record<string, number>; total: number }>;

    const buckets = new Map<
      string,
      { bucket: string; channels: Record<string, number>; total: number }
    >();

    for (const point of data.timeline) {
      const existing = buckets.get(point.bucket) ?? {
        bucket: point.bucket,
        channels: {},
        total: 0,
      };

      existing.channels[point.channelKey] =
        (existing.channels[point.channelKey] ?? 0) + point.count;
      existing.total += point.count;
      buckets.set(point.bucket, existing);
    }

    return Array.from(buckets.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
  }, [data]);

  const maxBucketTotal = useMemo(() => {
    return timelineByDay.reduce((max, b) => Math.max(max, b.total), 0);
  }, [timelineByDay]);

  return (
    <main className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <header className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-soft sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Overview de conectores
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Estado agregado de las conexiones Holded en todos los canales (dashboard, ChatGPT,
              mobile, Claude).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reload}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Cargando…' : 'Refrescar'}
            </button>
            <Link
              href="/tenants"
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver tenants
            </Link>
          </div>
        </div>
      </header>

      <HoldedConnectorsKpiCards showOverviewLink={false} />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Timeline de conexiones (30d)</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Nuevas conexiones por dia, apiladas por canal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            {(['dashboard', 'chatgpt', 'mobile', 'claude'] as const).map((channel) => (
              <span
                key={channel}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600"
              >
                <span className={`h-2 w-2 rounded-full ${CHANNEL_BAR[channel]}`} />
                {CHANNEL_LABEL[channel]}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {timelineByDay.length === 0 ? (
            <p className="text-xs text-slate-500">
              Sin conexiones registradas en los ultimos 30 dias.
            </p>
          ) : (
            <div className="flex h-32 items-end gap-1">
              {timelineByDay.map((bucket) => {
                const heightPct = maxBucketTotal > 0 ? (bucket.total / maxBucketTotal) * 100 : 0;
                return (
                  <div
                    key={bucket.bucket}
                    className="flex flex-1 flex-col items-center justify-end"
                    title={`${formatDay(bucket.bucket)} · ${bucket.total} nuevas`}
                  >
                    <div
                      className={`flex w-full flex-col-reverse rounded-t-md bg-slate-100 ${pctHeightClass(
                        Math.max(heightPct, 4)
                      )}`}
                    >
                      {(['dashboard', 'chatgpt', 'mobile', 'claude'] as const).map((channel) => {
                        const value = bucket.channels[channel] ?? 0;
                        if (!value) return null;
                        const segmentPct = bucket.total ? (value / bucket.total) * 100 : 0;
                        return (
                          <div
                            key={channel}
                            className={`${CHANNEL_BAR[channel]} ${pctHeightClass(segmentPct)}`}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-1 text-[9px] uppercase tracking-wide text-slate-400">
                      {formatDay(bucket.bucket)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-base font-semibold text-slate-900">Top tools (24h)</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Llamadas a tools MCP en las ultimas 24 horas, agrupadas por nombre y canal.
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
            {data?.topTools.length ? (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Tool</th>
                    <th className="px-3 py-2">Canal</th>
                    <th className="px-3 py-2 text-right">Llamadas</th>
                    <th className="px-3 py-2 text-right">Errores</th>
                    <th className="px-3 py-2">Ultima</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data.topTools.map((tool) => (
                    <tr key={`${tool.toolName}-${tool.channel ?? 'na'}`}>
                      <td className="px-3 py-2 font-mono text-[11px]">{tool.toolName}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            CHANNEL_BADGE[tool.channel ?? 'dashboard'] ??
                            'border-slate-200 bg-slate-100 text-slate-700'
                          }`}
                        >
                          {tool.channel ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{tool.calls}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                        {tool.errors}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-500">
                        {formatDate(tool.lastUsedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-3 py-4 text-xs text-slate-500">
                Sin llamadas a tools MCP en las ultimas 24 horas.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h2 className="text-base font-semibold text-slate-900">Errores 24h</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Conexiones con <code>connection_status=&#39;error&#39;</code> actualizadas en las
            ultimas 24h.
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
            {data?.errors24h.length ? (
              <ul className="divide-y divide-slate-100 text-xs">
                {data.errors24h.map((row) => (
                  <li key={row.connectionId} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/tenants/${row.tenantId}/connectors`}
                        className="truncate font-semibold text-slate-800 hover:text-slate-950"
                      >
                        {row.tenantLegalName ?? row.tenantId.slice(0, 8)}
                      </Link>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          CHANNEL_BADGE[row.channelKey] ??
                          'border-slate-200 bg-slate-100 text-slate-700'
                        }`}
                      >
                        {CHANNEL_LABEL[row.channelKey] ?? row.channelKey}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-rose-700">
                      {row.lastError ?? 'Error sin mensaje'}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {formatDate(row.updatedAt)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-4 text-xs text-slate-500">
                Sin errores en las ultimas 24 horas.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Eventos recientes (7d)</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Mezcla de `external_connection_audit_logs` (sync/conexiones) y
              `holded_mcp_pat_audit_logs` (uso de tokens MCP).
            </p>
          </div>
          <p className="text-[11px] text-slate-400">{data?.recentEvents.length ?? 0} eventos</p>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
          {data?.recentEvents.length ? (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">Tenant</th>
                  <th className="px-3 py-2">Canal</th>
                  <th className="px-3 py-2">Accion</th>
                  <th className="px-3 py-2">Detalle</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.recentEvents.map((row, idx) => (
                  <tr key={`${row.tenantId}-${row.occurredAt}-${idx}`}>
                    <td className="px-3 py-2 whitespace-nowrap text-[11px] text-slate-500">
                      {formatDate(row.occurredAt)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          row.source === 'mcp'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.source}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/tenants/${row.tenantId}/connectors`}
                        className="font-medium text-slate-800 hover:text-slate-950"
                      >
                        {row.tenantLegalName ?? row.tenantId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {row.channel ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            CHANNEL_BADGE[row.channel] ??
                            'border-slate-200 bg-slate-100 text-slate-700'
                          }`}
                        >
                          {CHANNEL_LABEL[row.channel] ?? row.channel}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]">{row.action}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-600">{row.detail ?? '—'}</td>
                    <td className="px-3 py-2 text-[11px]">
                      {row.status ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            row.status === 'error' || (row.status && Number(row.status) >= 400)
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-3 py-4 text-xs text-slate-500">Sin eventos en los ultimos 7 dias.</p>
          )}
        </div>
      </section>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          F6.2b · Datos en tiempo casi real (sin cache). El stream completo por tenant esta en
          /admin/tenants/[id]/connectors y proximamente en el audit log viewer (F6.4).
        </p>
        <Link
          href="/admin/connectors/smoke-tests"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-soft hover:bg-slate-50"
        >
          🧪 Smoke Tests API →
        </Link>
      </div>
    </main>
  );
}
