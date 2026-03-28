import Link from 'next/link';
import type { Metadata } from 'next';
import { disconnectTenantAction } from '../actions';
import { formatAdminDate, getHoldedAdminConnections } from '@/app/lib/holded-admin-data';

export const metadata: Metadata = {
  title: 'Conexiones Holded | Admin',
  description: 'Vista operativa de conexiones Holded.',
};

export const dynamic = 'force-dynamic';

type HoldedAdminConnection = Awaited<ReturnType<typeof getHoldedAdminConnections>>[number];

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function HoldedAdminConnectionsPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) || {};
  const q = readParam(resolved.q);
  const status = readParam(resolved.status) || 'all';
  const connections = await getHoldedAdminConnections({ q, status });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_42%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Conexiones Holded</h1>
          <form className="mt-4 flex flex-wrap gap-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por empresa o usuario"
              className="min-w-[240px] rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
            />
            <select
              name="status"
              defaultValue={status}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
            >
              <option value="all">Todas</option>
              <option value="connected">Conectadas</option>
              <option value="disconnected">Desconectadas</option>
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
                  <th className="px-4 py-3 font-semibold">Empresa</th>
                  <th className="px-4 py-3 font-semibold">Usuario principal</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Fechas</th>
                  <th className="px-4 py-3 font-semibold">Ultimo error</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((connection: HoldedAdminConnection) => {
                  const lastError = connection.auditLogs[0] || null;
                  return (
                    <tr key={connection.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">
                          {connection.tenant.name || 'Sin nombre'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {connection.tenant.legalName || 'Sin razon social'} · Tenant:{' '}
                          {connection.tenantId}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div>{connection.connectedByUser?.email || 'Sin usuario principal'}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {connection.connectedByUser?.name || 'Sin nombre'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div className="font-semibold text-slate-900">
                          {connection.connectionStatus}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div>Conexion: {formatAdminDate(connection.connectedAt)}</div>
                        <div className="mt-1">
                          Ultima validacion: {formatAdminDate(connection.lastValidatedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {lastError ? (
                          <>
                            <div>{lastError.action}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {typeof lastError.responsePayload === 'object' &&
                              lastError.responsePayload &&
                              'error' in lastError.responsePayload
                                ? String(
                                    (lastError.responsePayload as Record<string, unknown>).error ||
                                      'Error'
                                  )
                                : 'Sin detalle'}
                            </div>
                          </>
                        ) : (
                          'Sin errores recientes'
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          {connection.connectedByUser?.id ? (
                            <Link
                              href={`/admin/users/${connection.connectedByUser.id}`}
                              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Ver detalle
                            </Link>
                          ) : null}
                          {connection.connectionStatus === 'connected' ? (
                            <form action={disconnectTenantAction}>
                              <input type="hidden" name="tenantId" value={connection.tenantId} />
                              <button
                                type="submit"
                                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                Desconectar
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
