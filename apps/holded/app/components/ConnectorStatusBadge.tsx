/**
 * Widget público de estado del conector — Fase 1 / Opción B.
 *
 * Server Component: hace fetch del endpoint público
 * /api/public/status/{connector} de apps/app y renderiza:
 *
 *   1. Badge compacto (semáforo + texto + "última comprobación hace X" + 24h uptime)
 *   2. <details>/<summary> colapsable con la tabla por check
 *
 * Diseño defensivo: si el fetch falla, renderiza un badge neutro ("Estado
 * desconocido") en vez de romper el render de la landing.
 *
 * Cache: `next.revalidate = 60` empata con el edge cache del endpoint público
 * (s-maxage=60, SWR=300). La granularidad real del estado es 5 min (cron).
 */

import { Activity, AlertTriangle, CheckCircle2, ChevronDown, HelpCircle, XCircle } from 'lucide-react';

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_VERIFACTU_APP_URL?.trim() || 'https://app.verifactu.business';

type CheckStatus = 'ok' | 'degraded' | 'fail' | 'unknown';

type Check = {
  checkType: string;
  target: string;
  status: CheckStatus;
  latencyMs: number | null;
  httpStatus: number | null;
  lastCheckedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  uptime24hPct: number | null;
  latencyP95Ms24h: number | null;
  lastFailedAt: string | null;
  sampleCount24h: number;
};

type StatusResponse = {
  connector: 'chatgpt' | 'claude';
  overall: 'operational' | 'degraded' | 'down' | 'unknown';
  lastCheckedAt: string | null;
  checksTotal?: number;
  checksOk?: number;
  checksDegraded?: number;
  checksFail?: number;
  overallUptime24hPct: number | null;
  checks: Check[];
  error?: string;
};

const CHECK_TYPE_LABEL_ES: Record<string, string> = {
  landing: 'Página de aterrizaje',
  docs: 'Documentación',
  privacy: 'Política de privacidad',
  terms: 'Términos del servicio',
  dpa: 'Acuerdo de tratamiento (DPA)',
  health: 'Health endpoint',
  oauth_discovery: 'OAuth discovery',
  protected_resource: 'Protected resource metadata',
  mcp_initialize: 'MCP initialize',
  tools_list: 'MCP tools/list',
  mcp_requires_auth: 'MCP rechaza sin Bearer',
};

const CONNECTOR_LABEL: Record<'chatgpt' | 'claude', string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
};

function formatRelative(iso: string | null): string {
  if (!iso) return 'sin datos todavía';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return 'ahora mismo';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'hace menos de 1 min';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function formatLatency(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatUptime(pct: number | null): string {
  if (pct === null || pct === undefined) return '—';
  return `${pct.toFixed(1)}%`;
}

const OVERALL_STYLES = {
  operational: {
    label: 'Conector operativo',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
  },
  degraded: {
    label: 'Conector con latencia elevada',
    pill: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
  },
  down: {
    label: 'Conector con incidencias',
    pill: 'border-rose-200 bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
    icon: XCircle,
    iconClass: 'text-rose-600',
  },
  unknown: {
    label: 'Estado desconocido',
    pill: 'border-slate-200 bg-slate-50 text-slate-600',
    dot: 'bg-slate-400',
    icon: HelpCircle,
    iconClass: 'text-slate-500',
  },
} as const;

const CHECK_DOT: Record<CheckStatus, string> = {
  ok: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  fail: 'bg-rose-500',
  unknown: 'bg-slate-300',
};

async function fetchStatus(connector: 'chatgpt' | 'claude'): Promise<StatusResponse | null> {
  try {
    const res = await fetch(`${APP_BASE_URL}/api/public/status/${connector}`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as StatusResponse;
  } catch {
    return null;
  }
}

export async function ConnectorStatusBadge({
  connector,
}: {
  connector: 'chatgpt' | 'claude';
}) {
  const status = await fetchStatus(connector);
  const overall = (status?.overall ?? 'unknown') as keyof typeof OVERALL_STYLES;
  const styles = OVERALL_STYLES[overall];
  const Icon = styles.icon;
  const connectorLabel = CONNECTOR_LABEL[connector];

  const lastCheckedLabel = formatRelative(status?.lastCheckedAt ?? null);
  const uptime = status?.overallUptime24hPct;

  return (
    <section
      aria-label={`Estado del conector ${connectorLabel}`}
      className="mx-auto max-w-5xl px-4 sm:px-6"
    >
      <div className={`flex flex-col gap-3 rounded-2xl border p-4 ${styles.pill}`}>
        {/* ── Resumen compacto ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
            <Icon className={`h-5 w-5 shrink-0 ${styles.iconClass}`} aria-hidden />
            <div>
              <p className="text-sm font-semibold leading-snug">
                {styles.label} — {connectorLabel} ↔ Holded
              </p>
              <p className="mt-0.5 text-xs leading-snug opacity-80">
                Última comprobación {lastCheckedLabel}
                {uptime !== null && uptime !== undefined ? ` · ${formatUptime(uptime)} de uptime en 24 h` : ''}
              </p>
            </div>
          </div>

          {status && status.checksTotal !== undefined && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                {status.checksOk ?? 0} OK
              </span>
              {(status.checksDegraded ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                  {status.checksDegraded} degradados
                </span>
              )}
              {(status.checksFail ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
                  {status.checksFail} con fallo
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Detalle colapsable ── */}
        {status?.checks && status.checks.length > 0 && (
          <details className="group rounded-xl bg-white/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-medium opacity-80 hover:bg-white/80 hover:opacity-100">
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" aria-hidden />
                Ver detalle por check
              </span>
              <ChevronDown
                className="h-4 w-4 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="overflow-x-auto px-3 pb-3">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wider opacity-70">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">Surface check</th>
                    <th className="px-2 py-1.5 font-semibold">Estado</th>
                    <th className="px-2 py-1.5 font-semibold text-right">Latencia</th>
                    <th className="px-2 py-1.5 font-semibold text-right">Uptime 24 h</th>
                    <th className="px-2 py-1.5 font-semibold text-right whitespace-nowrap">Última caída</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {status.checks.map((check) => (
                    <tr key={check.checkType}>
                      <td className="px-2 py-1.5">
                        <span className="font-medium">
                          {CHECK_TYPE_LABEL_ES[check.checkType] ?? check.checkType}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-flex h-2 w-2 rounded-full ${CHECK_DOT[check.status]}`}
                            aria-hidden
                          />
                          <span className="capitalize">{check.status}</span>
                          {check.status === 'fail' && check.lastErrorCode && (
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                              {check.lastErrorCode}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {formatLatency(check.latencyMs)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {formatUptime(check.uptime24hPct)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap opacity-70">
                        {check.lastFailedAt ? formatRelative(check.lastFailedAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[10px] leading-relaxed opacity-60">
                Checks ejecutados cada 5 minutos contra superficie pública (sin token). Uptime
                calculado sobre las últimas 24 h. Cache del endpoint público 60 s.
              </p>
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
