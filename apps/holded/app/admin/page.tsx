import Link from 'next/link';
import type { Metadata } from 'next';
import { requireHoldedAdminSession } from '@/app/lib/holded-admin';
import { prisma } from '@/app/lib/prisma';
import { disconnectTenantAction, toggleUserBlockAction } from './actions';

export const metadata: Metadata = {
  title: 'Admin | Isaak para Holded',
  description: 'Panel basico para revisar usuarios, conexiones Holded y actividad del producto.',
};

function formatDate(value: Date | null | undefined) {
  if (!value) return 'Sin dato';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function HoldedAdminPage() {
  await requireHoldedAdminSession();

  const [users, totalUsers, connectedUsers, onboardedUsers, totalMessages] = await Promise.all([
    prisma.user.findMany({
      where: { authProvider: 'FIREBASE' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        onboarding: {
          select: {
            completedAt: true,
          },
        },
        tenantMemberships: {
          where: { status: 'active' },
          take: 1,
          select: {
            role: true,
            tenant: {
              select: {
                id: true,
                name: true,
                legalName: true,
                externalConnections: {
                  where: { provider: 'holded' },
                  select: {
                    connectionStatus: true,
                    connectedAt: true,
                    lastValidatedAt: true,
                    scopesGranted: true,
                  },
                },
              },
            },
          },
        },
        isaakConversations: {
          orderBy: { lastActivity: 'desc' },
          take: 1,
          select: {
            lastActivity: true,
            messageCount: true,
          },
        },
        _count: {
          select: {
            isaakConversations: true,
          },
        },
      },
    }),
    prisma.user.count({ where: { authProvider: 'FIREBASE' } }),
    prisma.externalConnection.count({
      where: { provider: 'holded', connectionStatus: 'connected' },
    }),
    prisma.userOnboarding.count({ where: { completedAt: { not: null } } }),
    prisma.isaakConversationMsg.count(),
  ]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_42%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                Admin Holded
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Vision general de usuarios y conexiones
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Panel minimo para revisar altas, onboarding, conexion con Holded y actividad de chat
                sin salir de holded.verifactu.business.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Volver al dashboard
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-600">Usuarios registrados</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{totalUsers}</div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-600">Con Holded conectado</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{connectedUsers}</div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-600">Onboarding completado</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{onboardedUsers}</div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-600">Mensajes en Isaak</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{totalMessages}</div>
          </article>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-950">Usuarios recientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Tenant</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Chat</th>
                  <th className="px-4 py-3 font-semibold">Alta</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const membership = user.tenantMemberships[0] || null;
                  const tenant = membership?.tenant || null;
                  const connection = tenant?.externalConnections[0] || null;
                  const lastConversation = user.isaakConversations[0] || null;

                  return (
                    <tr key={user.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{user.email}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {user.name || 'Sin nombre'} · {user.role}
                        </div>
                        <div
                          className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.isBlocked
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {user.isBlocked ? 'Bloqueado' : 'Activo'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div>{tenant?.name || 'Sin tenant'}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {tenant?.legalName || 'Sin razon social'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div>
                          Holded:{' '}
                          <span className="font-semibold text-slate-900">
                            {connection?.connectionStatus || 'disconnected'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Onboarding: {user.onboarding?.completedAt ? 'completado' : 'pendiente'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Validacion: {formatDate(connection?.lastValidatedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div>{user._count.isaakConversations} conversaciones</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Ultima actividad: {formatDate(lastConversation?.lastActivity)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Mensajes ultimo hilo: {lastConversation?.messageCount || 0}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div>{formatDate(user.createdAt)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Conexion: {formatDate(connection?.connectedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <form action={toggleUserBlockAction}>
                            <input type="hidden" name="userId" value={user.id} />
                            <input
                              type="hidden"
                              name="nextBlocked"
                              value={user.isBlocked ? 'false' : 'true'}
                            />
                            <button
                              type="submit"
                              className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              {user.isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                            </button>
                          </form>

                          {tenant?.id && connection?.connectionStatus === 'connected' ? (
                            <form action={disconnectTenantAction}>
                              <input type="hidden" name="tenantId" value={tenant.id} />
                              <button
                                type="submit"
                                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
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
