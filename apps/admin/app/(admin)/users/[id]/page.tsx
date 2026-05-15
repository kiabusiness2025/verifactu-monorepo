import { requireAdminSession } from '@/lib/auth';
import { query } from '@/lib/db';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UserActions } from './UserActions';

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

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'border-violet-200 bg-violet-50 text-violet-700',
  OWNER: 'border-blue-200 bg-blue-50 text-blue-700',
  MEMBER: 'border-slate-200 bg-slate-100 text-slate-600',
};

type MembershipRow = {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  tenant_legal_name: string | null;
  tenant_nif: string | null;
  role: string;
  status: string;
  created_at: string;
};

type ConnectionRow = {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  channel_key: string | null;
  connection_status: string;
  connected_at: string | null;
  last_validated_at: string | null;
};

type PageProps = { params: Promise<{ id: string }> };

function fmt(v: string | Date | null | undefined) {
  if (!v) return '—';
  try {
    return new Date(v as string).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(v);
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

export default async function UserDetailPage({ params }: PageProps) {
  await requireAdminSession();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      role: true,
      isBlocked: true,
      blockedAt: true,
      blockedReason: true,
    },
  });

  if (!user) notFound();

  const memberships = await query<MembershipRow>(
    `SELECT
      m.id,
      m.tenant_id,
      t.name AS tenant_name,
      t.legal_name AS tenant_legal_name,
      t.nif AS tenant_nif,
      m.role,
      m.status,
      m.created_at::text AS created_at
    FROM memberships m
    JOIN tenants t ON t.id = m.tenant_id
    WHERE m.user_id = $1
    ORDER BY m.created_at DESC`,
    [id]
  );

  const tenantIds = memberships.map((m) => m.tenant_id);

  const connections =
    tenantIds.length > 0
      ? await query<ConnectionRow>(
          `SELECT
            ec.id,
            ec.tenant_id,
            COALESCE(t.legal_name, t.name) AS tenant_name,
            ec.channel_key,
            ec.connection_status,
            ec.connected_at::text AS connected_at,
            ec.last_validated_at::text AS last_validated_at
          FROM external_connections ec
          JOIN tenants t ON t.id = ec.tenant_id
          WHERE ec.provider = 'holded'
            AND ec.tenant_id = ANY($1::uuid[])
          ORDER BY ec.connection_status = 'connected' DESC, ec.connected_at DESC NULLS LAST`,
          [tenantIds]
        )
      : [];

  const displayName = user.name ?? user.email;

  return (
    <main className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/users" className="hover:text-slate-700">
          Usuarios
        </Link>
        <span>/</span>
        <span className="truncate text-slate-600">{user.email}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{displayName}</h1>
          {user.name && <p className="text-sm text-slate-500">{user.email}</p>}
        </div>
        <div className="flex items-center gap-2">
          {user.isBlocked && (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              Bloqueado
            </span>
          )}
          {user.role !== 'USER' && (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              {user.role}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: info + memberships */}
        <div className="lg:col-span-2 space-y-4">
          {/* User info */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Datos del usuario</h2>
            <MetaRow label="ID" value={<code className="text-xs">{user.id}</code>} />
            <MetaRow label="Email" value={user.email} />
            <MetaRow label="Nombre" value={user.name} />
            <MetaRow label="Rol" value={user.role} />
            <MetaRow label="Registrado" value={fmt(user.createdAt)} />
            {user.isBlocked && (
              <>
                <MetaRow
                  label="Bloqueado el"
                  value={<span className="text-rose-600">{fmt(user.blockedAt)}</span>}
                />
                {user.blockedReason && (
                  <MetaRow
                    label="Motivo bloqueo"
                    value={<span className="text-rose-600">{user.blockedReason}</span>}
                  />
                )}
              </>
            )}
          </div>

          {/* Memberships */}
          {memberships.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-700">Empresas</h2>
                <span className="text-xs text-slate-400">{memberships.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {memberships.map((m) => {
                  const name = m.tenant_legal_name ?? m.tenant_name ?? m.tenant_id.slice(0, 8);
                  const roleBadge =
                    ROLE_BADGE[m.role] ?? 'border-slate-200 bg-slate-100 text-slate-600';
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/tenants/${m.tenant_id}/overview`}
                          className="text-sm font-medium text-slate-900 hover:text-[#2361d8]"
                        >
                          {name}
                        </Link>
                        {m.tenant_nif && (
                          <span className="ml-1.5 text-xs text-slate-400">{m.tenant_nif}</span>
                        )}
                        <div className="mt-0.5 text-xs text-slate-400">{fmt(m.created_at)}</div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${roleBadge}`}
                      >
                        {m.role}
                      </span>
                      <Link
                        href={`/tenants/${m.tenant_id}/connectors`}
                        className="shrink-0 text-xs text-slate-400 hover:text-[#2361d8]"
                      >
                        Conectores →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Holded connections */}
          {connections.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-700">Conectores Holded</h2>
                <span className="text-xs text-slate-400">{connections.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {connections.map((c) => {
                  const ch = c.channel_key ?? 'dashboard';
                  const chLabel = CHANNEL_LABELS[ch] ?? ch;
                  const chBadge =
                    CHANNEL_BADGE[ch] ?? 'border-slate-200 bg-slate-100 text-slate-700';
                  const stBadge =
                    STATUS_BADGE[c.connection_status] ??
                    'border-slate-200 bg-slate-100 text-slate-500';
                  const stLabel = STATUS_LABELS[c.connection_status] ?? c.connection_status;
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-slate-700">
                          {c.tenant_name ?? c.tenant_id.slice(0, 8)}
                        </span>
                        <div className="mt-0.5 text-xs text-slate-400">
                          Conectado: {fmt(c.connected_at)}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chBadge}`}
                      >
                        {chLabel}
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stBadge}`}
                      >
                        {stLabel}
                      </span>
                      <Link
                        href={`/connectors/${c.id}`}
                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Ver →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Acciones</h2>
            <UserActions userId={user.id} email={user.email} isBlocked={user.isBlocked} />
          </div>

          {/* Stats */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Resumen</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Empresas</span>
                <span className="font-medium">{memberships.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Conectores Holded</span>
                <span className="font-medium">{connections.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Activos</span>
                <span className="font-medium text-emerald-600">
                  {connections.filter((c) => c.connection_status === 'connected').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
