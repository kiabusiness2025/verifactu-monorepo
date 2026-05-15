import { query } from '@/lib/db';
import { requireAdminSession } from '@/lib/auth';
import Link from 'next/link';
import { ConnectorsFilters } from './ConnectorsFilters';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

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
  error: 'Error',
  revoked_api: 'Revocado',
  disconnected: 'Desconectado',
};

type Row = {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  channel_key: string | null;
  connection_status: string;
  connected_at: string | null;
  last_activity: string | null;
  last_error: string | null;
  connected_by_email: string | null;
  total: number;
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function str(v: string | string[] | undefined) {
  return typeof v === 'string' ? v : '';
}

function fmt(v: string | null) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return v;
  }
}

function pageUrl(page: number, search: string, channel: string, status: string) {
  const sp = new URLSearchParams();
  if (page > 1) sp.set('page', String(page));
  if (search) sp.set('search', search);
  if (channel !== 'all') sp.set('channel', channel);
  if (status !== 'all') sp.set('status', status);
  const q = sp.toString();
  return `/connectors${q ? `?${q}` : ''}`;
}

export default async function ConnectorsPage({ searchParams }: PageProps) {
  await requireAdminSession();

  const params = await searchParams;
  const rawPage = parseInt(str(params.page) || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = str(params.search).trim();
  const channel = str(params.channel) || 'all';
  const status = str(params.status) || 'all';
  const offset = (page - 1) * PAGE_SIZE;

  const conditions: string[] = ["ec.provider = 'holded'"];
  const sqlParams: unknown[] = [];
  let idx = 1;

  if (channel !== 'all') {
    conditions.push(`ec.channel_key = $${idx++}`);
    sqlParams.push(channel);
  }
  if (status !== 'all') {
    conditions.push(`ec.connection_status = $${idx++}`);
    sqlParams.push(status);
  }
  if (search) {
    conditions.push(`(COALESCE(t.legal_name, t.name) ILIKE $${idx} OR u.email ILIKE $${idx})`);
    sqlParams.push(`%${search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');

  const rows = await query<Row>(
    `
    SELECT
      ec.id,
      ec.tenant_id,
      COALESCE(t.legal_name, t.name) AS tenant_name,
      ec.channel_key,
      ec.connection_status,
      ec.connected_at::text AS connected_at,
      COALESCE(ec.last_sync_at, ec.last_validated_at)::text AS last_activity,
      ec.last_error,
      u.email AS connected_by_email,
      COUNT(*) OVER()::int AS total
    FROM external_connections ec
    LEFT JOIN tenants t ON t.id = ec.tenant_id
    LEFT JOIN users u ON u.id = ec.connected_by_user_id
    WHERE ${where}
    ORDER BY
      CASE ec.connection_status
        WHEN 'connected' THEN 0
        WHEN 'error' THEN 1
        WHEN 'revoked_api' THEN 2
        ELSE 3
      END,
      COALESCE(ec.last_sync_at, ec.last_validated_at, ec.connected_at) DESC NULLS LAST,
      ec.created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
    `,
    [...sqlParams, PAGE_SIZE, offset]
  );

  const total = rows[0]?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <main className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Conectores</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {total.toLocaleString('es-ES')} conexión{total !== 1 ? 'es' : ''} Holded
            {search && (
              <span className="ml-1 text-slate-400">
                · filtrando por <strong className="text-slate-600">{search}</strong>
              </span>
            )}
          </p>
        </div>
        <Link
          href="/connectors/overview"
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Ver estadísticas →
        </Link>
      </header>

      <ConnectorsFilters initialSearch={search} initialChannel={channel} initialStatus={status} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Tenant
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Canal
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Estado
              </th>
              <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:table-cell">
                Conectado
              </th>
              <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:table-cell">
                Última actividad
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  No se encontraron conexiones
                  {search ? ` para "${search}"` : ''}.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const ch = row.channel_key ?? 'dashboard';
                const chLabel = CHANNEL_LABELS[ch] ?? ch;
                const chBadge = CHANNEL_BADGE[ch] ?? 'border-slate-200 bg-slate-100 text-slate-700';
                const stBadge =
                  STATUS_BADGE[row.connection_status] ??
                  'border-slate-200 bg-slate-100 text-slate-500';
                const stLabel = STATUS_LABELS[row.connection_status] ?? row.connection_status;
                return (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/tenants/${row.tenant_id}/overview`}
                        className="font-medium text-slate-900 hover:text-[#2361d8]"
                      >
                        {row.tenant_name ?? row.tenant_id.slice(0, 8)}
                      </Link>
                      {row.connected_by_email && (
                        <div className="mt-0.5 truncate text-xs text-slate-400">
                          {row.connected_by_email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chBadge}`}
                      >
                        {chLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stBadge}`}
                      >
                        {stLabel}
                      </span>
                      {row.last_error && (
                        <div
                          className="mt-0.5 line-clamp-1 text-[10px] text-rose-600"
                          title={row.last_error}
                        >
                          {row.last_error.slice(0, 60)}
                        </div>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-xs tabular-nums text-slate-500 md:table-cell">
                      {fmt(row.connected_at)}
                    </td>
                    <td className="hidden px-4 py-3 text-xs tabular-nums text-slate-500 lg:table-cell">
                      {fmt(row.last_activity)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/connectors/${row.id}`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total.toLocaleString('es-ES')}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1, search, channel, status)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1, search, channel, status)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
