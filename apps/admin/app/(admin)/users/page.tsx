import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/src/lib/formatters';
import { Prisma } from '@verifactu/db';
import Link from 'next/link';
import { UsersSearchBar } from './UsersSearchBar';
import BetaInviteForm from './BetaInviteForm';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function str(v: string | string[] | undefined): string {
  return typeof v === 'string' ? v : '';
}

function pageUrl(page: number, search: string, status: string) {
  const sp = new URLSearchParams();
  if (page > 1) sp.set('page', String(page));
  if (search) sp.set('search', search);
  if (status !== 'all') sp.set('status', status);
  const q = sp.toString();
  return `/users${q ? `?${q}` : ''}`;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawPage = parseInt(str(params.page) || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = str(params.search).trim();
  const status = str(params.status) || 'all';
  const skip = (page - 1) * PAGE_SIZE;

  const where: Prisma.UserWhereInput = {
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(status === 'blocked' ? { isBlocked: true } : {}),
    ...(status === 'connected'
      ? {
          tenantMemberships: {
            some: {
              status: { not: 'disabled' },
              tenant: {
                externalConnections: {
                  some: { provider: 'holded', connectionStatus: 'connected' },
                },
              },
            },
          },
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        isBlocked: true,
        createdAt: true,
        tenantMemberships: {
          where: { status: { not: 'disabled' } },
          select: {
            tenant: {
              select: { id: true, name: true, legalName: true },
            },
          },
          take: 3,
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Holded connection status for this page of users
  const userIds = users.map((u) => u.id);
  type ConnectedRow = { user_id: string };
  const connectedRows: ConnectedRow[] =
    userIds.length > 0
      ? await prisma.$queryRaw<ConnectedRow[]>`
          SELECT DISTINCT m.user_id
          FROM memberships m
          INNER JOIN external_connections ec ON ec.tenant_id = m.tenant_id
          WHERE ec.provider = 'holded'
            AND ec.connection_status = 'connected'
            AND m.user_id = ANY(${userIds}::text[])
            AND COALESCE(m.status, 'active') <> 'disabled'
        `
      : [];
  const connectedSet = new Set(connectedRows.map((r) => r.user_id));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const exportSp = new URLSearchParams();
  if (search) exportSp.set('search', search);
  if (status !== 'all') exportSp.set('status', status);
  const exportUrl = `/api/admin/users/export${exportSp.toString() ? `?${exportSp}` : ''}`;

  return (
    <main className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Usuarios</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {total.toLocaleString('es-ES')} usuario{total !== 1 ? 's' : ''} registrados
            {search && (
              <span className="ml-1 text-slate-400">
                · filtrando por <strong className="text-slate-600">{search}</strong>
              </span>
            )}
          </p>
        </div>
        <a
          href={exportUrl}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Exportar CSV
        </a>
      </header>

      <BetaInviteForm />

      <UsersSearchBar initialSearch={search} initialStatus={status} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Usuario
              </th>
              <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:table-cell">
                Empresas
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Holded
              </th>
              <th className="hidden px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:table-cell">
                Registro
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  No se encontraron usuarios
                  {search ? ` para "${search}"` : ''}.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isConnected = connectedSet.has(user.id);
                const tenants = user.tenantMemberships.map(
                  (m) => m.tenant.legalName ?? m.tenant.name
                );
                return (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/users/${user.id}`} className="group block">
                        <div className="font-medium text-slate-900 group-hover:text-[#2361d8]">
                          {user.email}
                        </div>
                        {user.name && (
                          <div className="mt-0.5 truncate text-xs text-slate-400">{user.name}</div>
                        )}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {tenants.slice(0, 2).map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
                          >
                            {name}
                          </span>
                        ))}
                        {user.tenantMemberships.length > 2 && (
                          <span className="text-[11px] text-slate-400">
                            +{user.tenantMemberships.length - 2}
                          </span>
                        )}
                        {tenants.length === 0 && (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-200'}`}
                        />
                        <span
                          className={`text-[11px] font-medium ${isConnected ? 'text-emerald-700' : 'text-slate-400'}`}
                        >
                          {isConnected ? 'Conectado' : '—'}
                        </span>
                        {user.isBlocked && (
                          <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                            Bloqueado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-right text-xs tabular-nums text-slate-400 md:table-cell">
                      {formatDateTime(user.createdAt.toISOString())}
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
            {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} de {total.toLocaleString('es-ES')}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1, search, status)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1, search, status)}
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
