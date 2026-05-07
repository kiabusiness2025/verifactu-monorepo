'use client';

/**
 * F6.4 — Audit log viewer por tenant.
 *
 * Reemplaza el placeholder anterior. Stream mixto de:
 *   - external_connection_audit_logs (sync/conexiones)
 *   - holded_mcp_pat_audit_logs (uso de PATs MCP)
 *
 * Filtros: action, channel, since (preset 24h/7d/30d), limit. Default 100
 * eventos.
 */

import { adminGet } from '@/lib/adminApi';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type AuditEntry = {
  source: 'connection' | 'mcp' | string;
  occurredAt: string;
  refId: string | null;
  user: { userId: string; email: string | null; name: string | null } | null;
  action: string;
  channel: string | null;
  detail: string | null;
  status: string | null;
  ip: string | null;
  userAgent: string | null;
  meta: Record<string, unknown> | null;
};

type AuditResponse = {
  tenantId: string;
  filters: { action: string | null; channel: string | null; since: string | null; limit: number };
  items: AuditEntry[];
};

const ACTION_PRESETS = [
  { value: '', label: 'Todas' },
  { value: 'created', label: 'Creadas' },
  { value: 'used', label: 'Usadas' },
  { value: 'revoked', label: 'Revocadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'error', label: 'Errores' },
];

const CHANNEL_PRESETS = [
  { value: '', label: 'Todos' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'claude', label: 'Claude' },
];

const SINCE_PRESETS = [
  { value: '24h', label: 'Ultimas 24h', hours: 24 },
  { value: '7d', label: 'Ultimos 7d', hours: 24 * 7 },
  { value: '30d', label: 'Ultimos 30d', hours: 24 * 30 },
  { value: 'all', label: 'Todo', hours: 0 },
];

const CHANNEL_BADGE: Record<string, string> = {
  dashboard: 'bg-slate-100 text-slate-700 border-slate-200',
  chatgpt: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mobile: 'bg-sky-50 text-sky-700 border-sky-200',
  claude: 'bg-amber-50 text-amber-700 border-amber-200',
};

function resolveSinceISO(value: string): string | null {
  const preset = SINCE_PRESETS.find((entry) => entry.value === value);
  if (!preset || preset.hours === 0) return null;
  return new Date(Date.now() - preset.hours * 60 * 60 * 1000).toISOString();
}

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  } catch {
    return value;
  }
}

function statusClass(status: string | null) {
  if (!status) return 'border-slate-200 bg-slate-100 text-slate-700';
  const numeric = Number(status);
  if (!Number.isNaN(numeric) && numeric >= 400) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  if (status === 'error' || status === 'rejected') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  if (status === 'success' || status === 'ok' || status === 'used') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

export default function TenantAuditPage() {
  const params = useParams<{ id: string }>();
  const tenantId = (params?.id as string) || '';

  const [actionFilter, setActionFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [sincePreset, setSincePreset] = useState('7d');
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    const sinceIso = resolveSinceISO(sincePreset);
    const qs = new URLSearchParams();
    if (actionFilter) qs.set('action', actionFilter);
    if (channelFilter) qs.set('channel', channelFilter);
    if (sinceIso) qs.set('since', sinceIso);
    qs.set('limit', '150');
    try {
      const response = await adminGet<AuditResponse>(
        `/api/admin/tenants/${tenantId}/audit-log?${qs.toString()}`
      );
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar audit log');
    } finally {
      setLoading(false);
    }
  }, [tenantId, actionFilter, channelFilter, sincePreset]);

  useEffect(() => {
    reload();
  }, [reload]);

  const totalEvents = data?.items.length ?? 0;
  const errorCount = useMemo(
    () =>
      (data?.items ?? []).filter((row) => {
        const numeric = Number(row.status);
        if (!Number.isNaN(numeric) && numeric >= 400) return true;
        return row.status === 'error' || row.status === 'rejected';
      }).length,
    [data]
  );

  return (
    <main className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Audit log</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Eventos de seguridad y uso del conector. Combina sync (`external_connection_audit_logs`)
            y MCP (`holded_mcp_pat_audit_logs`).
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? 'Cargando…' : 'Refrescar'}
        </button>
      </header>

      {/* Filtros */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Accion
            </span>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              {ACTION_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Canal
            </span>
            <select
              value={channelFilter}
              onChange={(event) => setChannelFilter(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              {CHANNEL_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Periodo
            </span>
            <select
              value={sincePreset}
              onChange={(event) => setSincePreset(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              {SINCE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
          <span>{totalEvents} eventos</span>
          {errorCount > 0 ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
              {errorCount} errores
            </span>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        {loading && !data ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">Cargando audit log…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            Sin eventos para los filtros seleccionados.
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Origen</th>
                <th className="px-3 py-2">Canal</th>
                <th className="px-3 py-2">Accion</th>
                <th className="px-3 py-2">Detalle</th>
                <th className="px-3 py-2">Usuario</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data.items.map((row, idx) => (
                <tr key={`${row.source}-${row.occurredAt}-${idx}`}>
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
                    {row.channel ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          CHANNEL_BADGE[row.channel] ??
                          'border-slate-200 bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.channel}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">{row.action}</td>
                  <td className="px-3 py-2 text-[11px]">
                    {row.detail ? (
                      <span className="font-mono">{row.detail}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px]">
                    {row.user ? (
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {row.user.name ?? row.user.email ?? row.user.userId.slice(0, 8)}
                        </span>
                        {row.user.email ? (
                          <span className="text-slate-500">{row.user.email}</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px]">
                    {row.status ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                          row.status
                        )}`}
                      >
                        {row.status}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-500">{row.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-xs text-slate-400">
        F6.4 · Limite duro 150 eventos por pagina. Filtros aplicados en backend (ILIKE) — para mas
        historial usa el log de Render del MCP server.
      </p>
    </main>
  );
}
