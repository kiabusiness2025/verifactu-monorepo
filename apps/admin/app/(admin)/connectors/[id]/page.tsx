import { requireAdminSession } from '@/lib/auth';
import { one, query } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConnectorActions } from './ConnectorActions';

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
        {/* Metadata card */}
        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
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
                <Link href={`/users/${row.connected_by_user_id}`} className="hover:text-[#2361d8]">
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
          {row.disconnected_at && <MetaRow label="Desconectado" value={fmt(row.disconnected_at)} />}
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
