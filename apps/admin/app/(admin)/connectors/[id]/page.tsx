import { requireAdminSession } from '@/lib/auth';
import { one, query } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConnectorActions } from './ConnectorActions';
import { ConnectorTokens } from './ConnectorTokens';

export const dynamic = 'force-dynamic';

const CHANNEL_LABELS: Record<string, string> = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  dashboard: 'Dashboard',
  mobile: 'Mobile',
};

const CHANNEL_BADGE: Record<string, string> = {
  claude: 'border-amber-200 bg-amber-50 text-amber-800',
  chatgpt: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  dashboard: 'border-slate-200 bg-slate-100 text-slate-700',
  mobile: 'border-sky-200 bg-sky-50 text-sky-800',
};

const STATUS_BADGE: Record<string, string> = {
  connected: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-amber-200 bg-amber-50 text-amber-700',
  revoked_api: 'border-rose-200 bg-rose-50 text-rose-700',
  disconnected: 'border-slate-200 bg-slate-100 text-slate-500',
};

const STATUS_LABELS: Record<string, string> = {
  connected: 'Conectado',
  error: 'Con error',
  revoked_api: 'Revocado',
  disconnected: 'Desconectado',
};

type ConnRow = {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  tenant_tax_id: string | null;
  channel_key: string | null;
  connection_status: string;
  api_key_enc: string | null;
  high_governance_risk: boolean | null;
  under_claim_review: boolean | null;
  connected_at: string | null;
  last_validated_at: string | null;
  last_sync_at: string | null;
  disconnected_at: string | null;
  revoked_at: string | null;
  last_error: string | null;
  legal_terms_accepted_at: string | null;
  legal_acceptance_version: string | null;
  created_at: string;
  connected_by_user_id: string | null;
  connected_by_email: string | null;
  connected_by_name: string | null;
};

type AuditRow = {
  id: string;
  event_type: string;
  actor_email: string | null;
  created_at: string;
};

type TokenRow = {
  id: string;
  name: string;
  key_prefix: string;
  channel_key: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type ActivityRow = {
  tool_name: string | null;
  channel: string | null;
  status: number | null;
  created_at: string;
};

type ActivityStats = {
  today: number;
  week_7d: number;
  month_30d: number;
  unique_tools_7d: number;
};

type PageProps = { params: Promise<{ id: string }> };

function fmt(v: string | null) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return v;
  }
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-slate-100">
      <span className="w-36 shrink-0 text-xs font-semibold text-slate-500">{label}</span>
      <span className="text-sm text-slate-800">{value ?? '—'}</span>
    </div>
  );
}

export default async function ConnectorDetailPage({ params }: PageProps) {
  await requireAdminSession();
  const { id } = await params;

  const row = await one<ConnRow>(
    `
    SELECT
      ec.id,
      ec.tenant_id,
      COALESCE(t.legal_name, t.name) AS tenant_name,
      t.nif AS tenant_tax_id,
      ec.channel_key,
      ec.connection_status,
      ec.api_key_enc,
      ec.high_governance_risk,
      ec.under_claim_review,
      ec.connected_at::text AS connected_at,
      ec.last_validated_at::text AS last_validated_at,
      ec.last_sync_at::text AS last_sync_at,
      ec.disconnected_at::text AS disconnected_at,
      ec.revoked_at::text AS revoked_at,
      ec.last_error,
      ec.legal_terms_accepted_at::text AS legal_terms_accepted_at,
      ec.legal_acceptance_version,
      ec.created_at::text AS created_at,
      ec.connected_by_user_id,
      u.email AS connected_by_email,
      u.name AS connected_by_name
    FROM external_connections ec
    LEFT JOIN tenants t ON t.id = ec.tenant_id
    LEFT JOIN users u ON u.id = ec.connected_by_user_id
    WHERE ec.id = $1
      AND ec.provider = 'holded'
    `,
    [id]
  );

  if (!row) notFound();

  const auditRows = await query<AuditRow>(
    `
    SELECT
      al.id,
      al.event_type,
      u.email AS actor_email,
      al.created_at::text AS created_at
    FROM external_connection_audit_logs al
    LEFT JOIN users u ON u.id = al.actor_user_id
    WHERE al.connection_id = $1
    ORDER BY al.created_at DESC
    LIMIT 20
    `,
    [id]
  );

  const tokenRows = await query<TokenRow>(
    `
    SELECT
      id,
      name,
      key_prefix,
      channel_key,
      scopes,
      last_used_at::text AS last_used_at,
      expires_at::text AS expires_at,
      created_at::text AS created_at
    FROM holded_mcp_personal_access_tokens
    WHERE connection_id = $1
      AND revoked_at IS NULL
    ORDER BY created_at DESC
    LIMIT 20
    `,
    [id]
  );

  const [activityRows, activityStats] = await Promise.all([
    query<ActivityRow>(
      `
      SELECT
        al.tool_name,
        al.channel,
        al.status,
        al.created_at::text AS created_at
      FROM holded_mcp_pat_audit_logs al
      JOIN holded_mcp_personal_access_tokens pat ON pat.id = al.pat_id
      WHERE pat.connection_id = $1
        AND al.event = 'used'
      ORDER BY al.created_at DESC
      LIMIT 50
      `,
      [id]
    ),
    query<ActivityStats>(
      `
      SELECT
        COUNT(*) FILTER (WHERE al.created_at >= NOW() - INTERVAL '24 hours')::int AS today,
        COUNT(*) FILTER (WHERE al.created_at >= NOW() - INTERVAL '7 days')::int AS week_7d,
        COUNT(*) FILTER (WHERE al.created_at >= NOW() - INTERVAL '30 days')::int AS month_30d,
        COUNT(DISTINCT al.tool_name) FILTER (WHERE al.created_at >= NOW() - INTERVAL '7 days')::int AS unique_tools_7d
      FROM holded_mcp_pat_audit_logs al
      JOIN holded_mcp_personal_access_tokens pat ON pat.id = al.pat_id
      WHERE pat.connection_id = $1
        AND al.event = 'used'
      `,
      [id]
    ),
  ]);

  const stats = activityStats[0] ?? { today: 0, week_7d: 0, month_30d: 0, unique_tools_7d: 0 };

  const ch = row.channel_key ?? 'dashboard';
  const chLabel = CHANNEL_LABELS[ch] ?? ch;
  const chBadge = CHANNEL_BADGE[ch] ?? 'border-slate-200 bg-slate-100 text-slate-700';
  const stBadge =
    STATUS_BADGE[row.connection_status] ?? 'border-slate-200 bg-slate-100 text-slate-500';
  const stLabel = STATUS_LABELS[row.connection_status] ?? row.connection_status;

  return (
    <main className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/connectors" className="hover:text-slate-700">
          Conectores
        </Link>
        <span>/</span>
        <span className="text-slate-600">{id.slice(0, 8)}…</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${chBadge}`}>
            {chLabel}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stBadge}`}>
            {stLabel}
          </span>
          {row.high_governance_risk && (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
              Governance Risk
            </span>
          )}
        </div>
        <Link
          href={`/tenants/${row.tenant_id}/connectors`}
          className="text-xs text-slate-500 hover:text-[#2361d8]"
        >
          Ver todos los conectores del tenant →
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Metadata card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Detalles de la conexión</h2>
            <MetaRow
              label="Tenant"
              value={
                <Link href={`/tenants/${row.tenant_id}/overview`} className="hover:text-[#2361d8]">
                  {row.tenant_name ?? row.tenant_id}
                  {row.tenant_tax_id && (
                    <span className="ml-1.5 text-xs text-slate-400">{row.tenant_tax_id}</span>
                  )}
                </Link>
              }
            />
            <MetaRow label="ID conexión" value={<code className="text-xs">{row.id}</code>} />
            <MetaRow label="Canal" value={chLabel} />
            <MetaRow label="Estado" value={stLabel} />
            <MetaRow
              label="API key"
              value={row.api_key_enc ? '●●●●●● (cifrada)' : 'Sin key (revocada)'}
            />
            <MetaRow
              label="Conectado por"
              value={
                row.connected_by_email ? (
                  <Link
                    href={`/users/${row.connected_by_user_id}`}
                    className="hover:text-[#2361d8]"
                  >
                    {row.connected_by_name
                      ? `${row.connected_by_name} (${row.connected_by_email})`
                      : row.connected_by_email}
                  </Link>
                ) : null
              }
            />
            <MetaRow label="Conectado el" value={fmt(row.connected_at)} />
            <MetaRow label="Última validación" value={fmt(row.last_validated_at)} />
            <MetaRow label="Último sync" value={fmt(row.last_sync_at)} />
            {row.disconnected_at && (
              <MetaRow label="Desconectado" value={fmt(row.disconnected_at)} />
            )}
            {row.revoked_at && <MetaRow label="Revocado" value={fmt(row.revoked_at)} />}
            {row.last_error && (
              <MetaRow
                label="Último error"
                value={<span className="text-rose-600">{row.last_error}</span>}
              />
            )}
            <MetaRow
              label="Terms aceptados"
              value={
                row.legal_terms_accepted_at
                  ? `${fmt(row.legal_terms_accepted_at)}${row.legal_acceptance_version ? ` (v${row.legal_acceptance_version})` : ''}`
                  : null
              }
            />
            <MetaRow label="Creado" value={fmt(row.created_at)} />
          </div>

          {/* Actividad real — PAT audit log */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-700">Actividad real (tool calls)</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  Hoy: <strong className="text-slate-800">{stats.today}</strong>
                </span>
                <span>
                  7d: <strong className="text-slate-800">{stats.week_7d}</strong>
                </span>
                <span>
                  30d: <strong className="text-slate-800">{stats.month_30d}</strong>
                </span>
                {stats.unique_tools_7d > 0 && (
                  <span className="rounded-full border border-[#2361d8]/20 bg-[#2361d8]/5 px-2 py-0.5 text-[#2361d8]">
                    {stats.unique_tools_7d} tools únicas / 7d
                  </span>
                )}
              </div>
            </div>
            {activityRows.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-400">
                Sin actividad registrada en este conector.
                {row.connection_status === 'connected' &&
                  ' Los tool calls aparecerán aquí en cuanto el usuario use Claude o ChatGPT.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-50">
                {activityRows.map((a, i) => {
                  const isOk = !a.status || a.status < 400;
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${isOk ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">
                        {a.tool_name ?? 'tool_call'}
                      </span>
                      {a.channel && (
                        <span className="shrink-0 text-[10px] text-slate-400">{a.channel}</span>
                      )}
                      {a.status && a.status >= 400 && (
                        <span className="shrink-0 text-[10px] font-semibold text-rose-600">
                          HTTP {a.status}
                        </span>
                      )}
                      <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                        {fmt(a.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* end left column */}

        {/* Actions + audit */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Acciones</h2>
            <ConnectorActions
              connectionId={row.id}
              tenantId={row.tenant_id}
              status={row.connection_status}
              hasApiKey={Boolean(row.api_key_enc)}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Tokens activos</h2>
              {tokenRows.length > 0 && (
                <span className="text-xs text-slate-400">{tokenRows.length}</span>
              )}
            </div>
            <ConnectorTokens
              connectionId={row.id}
              tokens={tokenRows.map((t) => ({
                id: t.id,
                name: t.name,
                keyPrefix: t.key_prefix,
                channelKey: t.channel_key,
                scopes: t.scopes,
                lastUsedAt: t.last_used_at,
                expiresAt: t.expires_at,
                createdAt: t.created_at,
              }))}
            />
          </div>

          {auditRows.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Historial</h2>
              <div className="space-y-2">
                {auditRows.map((a) => (
                  <div key={a.id} className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-slate-700">{a.event_type}</span>
                    <span className="text-[10px] text-slate-400">
                      {fmt(a.created_at)}
                      {a.actor_email && ` · ${a.actor_email}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
