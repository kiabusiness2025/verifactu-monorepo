/**
 * Widget público de estado del conector — variante discreta flotante.
 *
 * Server Component: hace fetch del endpoint público
 * /api/public/status/{connector} de apps/app y renderiza una anotación
 * compacta fija en la esquina inferior izquierda:
 *
 *   1. Pill discreto siempre visible (semáforo + "Conector X operativo")
 *   2. <details>/<summary> que despliega hacia arriba un panel con el
 *      detalle por tool y por superficie pública
 *
 * Diseño defensivo: si el fetch falla, renderiza un pill neutro ("Estado
 * desconocido") en vez de romper el render de la landing.
 *
 * Cache: `next.revalidate = 60` empata con el edge cache del endpoint público
 * (s-maxage=60, SWR=300). La granularidad real del estado es 5 min (cron),
 * con auto-refresco de respaldo en el propio endpoint público.
 */

import { AlertTriangle, CheckCircle2, ChevronUp, HelpCircle, XCircle } from 'lucide-react';

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_VERIFACTU_APP_URL?.trim() || 'https://app.verifactu.business';

type CheckStatus = 'ok' | 'degraded' | 'fail' | 'unknown';
type CheckKind = 'surface' | 'tool';

type Check = {
  checkType: string;
  kind?: CheckKind;
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
  surfaceTotal?: number;
  surfaceOk?: number;
  toolsTotal?: number;
  toolsOk?: number;
  toolsDegraded?: number;
  toolsFail?: number;
  toolsUnknown?: number;
  overallUptime24hPct: number | null;
  checks: Check[];
  error?: string;
};

const CHECK_TYPE_LABEL_ES: Record<string, string> = {
  // Superficie pública
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
  // Tools en vivo (revisión de funcionamiento real contra Holded)
  tool_list_documents: 'Tool · Listar documentos',
  tool_get_document: 'Tool · Detalle de documento',
  tool_get_document_pdf: 'Tool · PDF de documento',
  tool_list_invoices: 'Tool · Listar facturas',
  tool_get_invoice: 'Tool · Detalle de factura',
  tool_list_contacts: 'Tool · Listar contactos',
  tool_get_contact: 'Tool · Detalle de contacto',
  tool_get_chart_of_accounts: 'Tool · Plan de cuentas',
  tool_list_accounts: 'Tool · Plan de cuentas',
  tool_get_journal: 'Tool · Diario contable',
  tool_list_daily_ledger: 'Tool · Libro diario',
  tool_create_invoice_draft: 'Tool · Crear borrador de factura',
};

function isToolCheck(check: Check): boolean {
  return check.kind === 'tool' || check.checkType.startsWith('tool_');
}

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
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    header: 'border-emerald-100 bg-emerald-50/70 text-emerald-800',
    // Estado bueno → pill neutro y discreto.
    pill: 'border-slate-200 bg-white/95 text-slate-600',
    panelBorder: 'border-slate-200',
  },
  degraded: {
    label: 'Conector con latencia elevada',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
    header: 'border-amber-100 bg-amber-50/70 text-amber-800',
    pill: 'border-amber-300 bg-amber-50 text-amber-800',
    panelBorder: 'border-amber-200',
  },
  down: {
    label: 'Conector con incidencias',
    dot: 'bg-rose-500',
    icon: XCircle,
    iconClass: 'text-rose-600',
    header: 'border-rose-100 bg-rose-50/70 text-rose-800',
    pill: 'border-rose-300 bg-rose-50 text-rose-800',
    panelBorder: 'border-rose-200',
  },
  unknown: {
    label: 'Estado desconocido',
    dot: 'bg-slate-400',
    icon: HelpCircle,
    iconClass: 'text-slate-500',
    header: 'border-slate-100 bg-slate-50 text-slate-600',
    pill: 'border-slate-200 bg-white/95 text-slate-500',
    panelBorder: 'border-slate-200',
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

function CheckTable({
  checks,
  title,
  firstColLabel,
}: {
  checks: Check[];
  title: string;
  firstColLabel: string;
}) {
  if (checks.length === 0) return null;
  return (
    <div className="overflow-x-auto px-3 pb-1">
      <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <table className="w-full min-w-[440px] text-left text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-2 py-1.5 font-semibold">{firstColLabel}</th>
            <th className="px-2 py-1.5 font-semibold">Estado</th>
            <th className="px-2 py-1.5 font-semibold text-right">Latencia</th>
            <th className="px-2 py-1.5 font-semibold text-right">Uptime 24 h</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {checks.map((check) => (
            <tr key={check.checkType}>
              <td className="px-2 py-1.5">
                <span className="font-medium text-slate-700">
                  {CHECK_TYPE_LABEL_ES[check.checkType] ?? check.checkType}
                </span>
              </td>
              <td className="px-2 py-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${CHECK_DOT[check.status]}`}
                    aria-hidden
                  />
                  <span className="capitalize text-slate-600">{check.status}</span>
                  {check.status === 'fail' && check.lastErrorCode && (
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                      {check.lastErrorCode}
                    </span>
                  )}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-slate-500">
                {formatLatency(check.latencyMs)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-slate-500">
                {formatUptime(check.uptime24hPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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

  const pillLabel =
    overall === 'operational'
      ? `Conector ${connectorLabel} operativo`
      : `${styles.label} · ${connectorLabel}`;

  const toolChecks = status?.checks?.filter((c) => isToolCheck(c)) ?? [];
  const surfaceChecks = status?.checks?.filter((c) => !isToolCheck(c)) ?? [];

  return (
    <aside
      aria-label={`Estado del conector ${connectorLabel}`}
      className="fixed bottom-3 left-3 z-40 print:hidden"
    >
      <details className="group flex max-w-[calc(100vw-1.5rem)] flex-col-reverse items-start">
        {/* ── Pill discreto, siempre visible ── */}
        <summary
          className={`flex w-fit cursor-pointer list-none items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur transition-colors hover:brightness-[0.97] ${styles.pill}`}
        >
          <span className={`inline-flex h-2 w-2 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
          <span className="whitespace-nowrap">{pillLabel}</span>
          <ChevronUp
            className="h-3.5 w-3.5 shrink-0 opacity-50 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>

        {/* ── Panel desplegable (se abre hacia arriba) ── */}
        <div
          className={`mb-1.5 w-[28rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border bg-white shadow-xl ${styles.panelBorder}`}
        >
          <div className="max-h-[70vh] overflow-y-auto">
            {/* Cabecera */}
            <div className={`flex items-start gap-3 border-b px-4 py-3 ${styles.header}`}>
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${styles.iconClass}`} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug">
                  {styles.label} — {connectorLabel} ↔ Holded
                </p>
                <p className="mt-0.5 text-xs leading-snug opacity-80">
                  Última comprobación {lastCheckedLabel}
                  {uptime !== null && uptime !== undefined
                    ? ` · ${formatUptime(uptime)} de uptime en 24 h`
                    : ''}
                </p>
              </div>
            </div>

            {/* Resumen de contadores */}
            {status && status.checksTotal !== undefined && (
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs">
                {(status.toolsTotal ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-semibold text-slate-700">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        (status.toolsFail ?? 0) > 0
                          ? 'bg-rose-500'
                          : (status.toolsDegraded ?? 0) > 0
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      aria-hidden
                    />
                    {status.toolsOk ?? 0}/{status.toolsTotal} tools operativas
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  {status.checksOk ?? 0} OK
                </span>
                {(status.checksDegraded ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                    {status.checksDegraded} degradados
                  </span>
                )}
                {(status.checksFail ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
                    {status.checksFail} con fallo
                  </span>
                )}
              </div>
            )}

            {/* Detalle por check */}
            {status?.checks && status.checks.length > 0 && (
              <div className="border-t border-slate-100 pb-2">
                <CheckTable
                  checks={toolChecks}
                  title="Tools del conector · revisión en vivo"
                  firstColLabel="Tool"
                />
                <CheckTable
                  checks={surfaceChecks}
                  title="Superficie pública"
                  firstColLabel="Surface check"
                />
                <p className="mt-2 px-4 text-[10px] leading-relaxed text-slate-400">
                  La superficie pública se comprueba sin token; las tools se ejecutan en vivo
                  contra una cuenta Holded de pruebas. Checks cada 5 minutos, uptime sobre las
                  últimas 24 h.
                </p>
              </div>
            )}
          </div>
        </div>
      </details>
    </aside>
  );
}
