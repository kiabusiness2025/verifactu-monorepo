import Link from 'next/link';
import type { Metadata } from 'next';
import { disconnectTenantAction, toggleUserBlockAction } from '../actions';
import { formatAdminDate, getHoldedAdminUsers } from '@/app/lib/holded-admin-data';

export const metadata: Metadata = {
  title: 'Usuarios | Admin Holded',
  description: 'Vista operativa de usuarios de Holded.',
};

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function HoldedAdminUsersPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const q = readParam(resolved.q);
  const verification = readParam(resolved.verification);
  const onboarding = readParam(resolved.onboarding);
  const connection = readParam(resolved.connection);
  const users = await getHoldedAdminUsers({ q, verification, onboarding, connection });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_42%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Usuarios</h1>
          <form className="mt-4 flex flex-wrap gap-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por email o empresa"
              className="min-w-[240px] rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
            />
            <select
              name="verification"
              defaultValue={verification || ''}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
            >
              <option value="">Email: todos</option>
              <option value="verified">Verificados</option>
              <option value="pending">Pendientes</option>
            </select>
            <select
              name="onboarding"
              defaultValue={onboarding || ''}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
            >
              <option value="">Onboarding: todos</option>
              <option value="completed">Completado</option>
              <option value="pending">Pendiente</option>
            </select>
            <select
              name="connection"
              defaultValue={connection || ''}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
            >
              <option value="">Conexion: todas</option>
              <option value="connected">Conectado</option>
              <option value="disconnected">Sin conectar</option>
            </select>
            <button
              type="submit"
              className="rounded-full bg-[#ff5460] px-4 py-2 text-sm font-semibold text-white"
            >
              Filtrar
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Empresa</th>
                  <th className="px-4 py-3 font-semibold">Estados</th>
                  <th className="px-4 py-3 font-semibold">Ultimo acceso</th>
                  <th className="px-4 py-3 font-semibold">Chats</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const tenant = user.tenantMemberships[0]?.tenant || null;
                  const connectionInfo = tenant?.externalConnections[0] || null;
                  const lastLogin = user.externalConnectionAuditLogs[0]?.createdAt || null;

                  return (
                    <tr key={user.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{user.email}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {user.name || 'Sin nombre'} · Alta {formatAdminDate(user.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div>{tenant?.name || 'Sin empresa'}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {tenant?.legalName || 'Sin razon social'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Tenant: {tenant?.id || 'Sin tenant'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div>Email: {user.emailVerified ? 'verificado' : 'pendiente'}</div>
                        <div className="mt-1">
                          Onboarding: {user.onboarding?.completedAt ? 'completado' : 'pendiente'}
                        </div>
                        <div className="mt-1">
                          Holded: {connectionInfo?.connectionStatus || 'disconnected'}
                        </div>
                        <div className="mt-1">
                          Acceso: {user.isBlocked ? 'bloqueado' : 'activo'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatAdminDate(lastLogin)}</td>
                      <td className="px-4 py-4 text-slate-600">
                        <div>{user._count.isaakConversations}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Ultima actividad:{' '}
                          {formatAdminDate(user.isaakConversations[0]?.lastActivity)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Ver detalle
                          </Link>
                          <form action={toggleUserBlockAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <input
                              type="hidden"
                              name="nextBlocked"
                              value={user.isBlocked ? 'false' : 'true'}
                            />
                            <button
                              type="submit"
                              className="w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              {user.isBlocked ? 'Desbloquear' : 'Bloquear'}
                            </button>
                          </form>
                          {tenant?.id && connectionInfo?.connectionStatus === 'connected' ? (
                            <form action={disconnectTenantAction}>
                              <input type="hidden" name="tenantId" value={tenant.id} />
                              <button
                                type="submit"
                                className="w-full rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                Desconectar Holded
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
