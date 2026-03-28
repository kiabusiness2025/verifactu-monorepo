import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { disconnectTenantAction, toggleUserBlockAction } from '../../actions';
import { formatAdminDate, getHoldedAdminUserDetail } from '@/app/lib/holded-admin-data';

export const metadata: Metadata = {
  title: 'Detalle de usuario | Admin Holded',
  description: 'Ficha operativa de usuario en Holded.',
};

export const dynamic = 'force-dynamic';

type HoldedAdminUserDetail = NonNullable<Awaited<ReturnType<typeof getHoldedAdminUserDetail>>>;
type HoldedAuditEvent = HoldedAdminUserDetail['externalConnectionAuditLogs'][number];
type HoldedConversation = HoldedAdminUserDetail['isaakConversations'][number];

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function HoldedAdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getHoldedAdminUserDetail(id);

  if (!user) notFound();

  const membership = user.tenantMemberships[0] || null;
  const tenant = membership?.tenant || null;
  const connection = tenant?.externalConnections[0] || null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_42%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/admin/users" className="text-sm font-semibold text-[#ff5460]">
                Volver a usuarios
              </Link>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                {user.email}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {user.name || 'Sin nombre'} · alta {formatAdminDate(user.createdAt)}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <form action={toggleUserBlockAction}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="nextBlocked" value={user.isBlocked ? 'false' : 'true'} />
                <button
                  type="submit"
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {user.isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                </button>
              </form>
              {tenant?.id && connection?.connectionStatus === 'connected' ? (
                <form action={disconnectTenantAction}>
                  <input type="hidden" name="tenantId" value={tenant.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Desconectar Holded
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Estado del usuario</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div>Email verificado: {user.emailVerified ? 'si' : 'no'}</div>
              <div>Acceso: {user.isBlocked ? 'bloqueado' : 'activo'}</div>
              <div>Onboarding: {user.onboarding?.completedAt ? 'completado' : 'pendiente'}</div>
              <div>Rol interno: {user.role}</div>
              <div>Ultimo bloqueo: {formatAdminDate(user.blockedAt)}</div>
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Empresa y conexion</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div>Empresa: {tenant?.name || 'Sin empresa'}</div>
              <div>Razon social: {tenant?.legalName || 'Sin razon social'}</div>
              <div>Tax ID: {tenant?.nif || 'Sin tax id'}</div>
              <div>Tenant ID: {tenant?.id || 'Sin tenant'}</div>
              <div>Conexion Holded: {connection?.connectionStatus || 'disconnected'}</div>
              <div>Ultima validacion: {formatAdminDate(connection?.lastValidatedAt)}</div>
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Eventos recientes</h2>
            <div className="mt-4 space-y-3">
              {user.externalConnectionAuditLogs.map((event: HoldedAuditEvent) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="font-semibold text-slate-900">{event.action}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatAdminDate(event.createdAt)} · {event.tenant?.name || 'Sin tenant'}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Chats creados</h2>
            <div className="mt-4 space-y-3">
              {user.isaakConversations.map((conversation: HoldedConversation) => (
                <div
                  key={conversation.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="font-semibold text-slate-900">
                    {conversation.title || 'Chat con Isaak'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {conversation.messageCount} mensajes · ultima actividad{' '}
                    {formatAdminDate(conversation.lastActivity)}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
