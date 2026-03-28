import Link from 'next/link';
import type { Metadata } from 'next';
import { formatAdminDate, getHoldedAdminSummary } from '@/app/lib/holded-admin-data';

export const metadata: Metadata = {
  title: 'Admin | Isaak para Holded',
  description: 'Resumen operativo del lanzamiento de Holded.',
};

export const dynamic = 'force-dynamic';

type HoldedAdminSummary = Awaited<ReturnType<typeof getHoldedAdminSummary>>;
type HoldedRecentUser = HoldedAdminSummary['recentUsers'][number];
type HoldedRecentActivity = HoldedAdminSummary['recentActivity'][number];

export default async function HoldedAdminPage() {
  const summary = await getHoldedAdminSummary();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_42%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Resumen operativo del lanzamiento
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Vista rapida para saber quien se ha registrado, quien ha verificado, quien ha conectado
            Holded y quien ya usa Isaak.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['Usuarios registrados', summary.totalUsers],
            ['Emails verificados', summary.verifiedEmails],
            ['Conexiones Holded activas', summary.connectedUsers],
            ['Onboarding completados', summary.onboardedUsers],
            ['Usuarios con al menos 1 chat', summary.usersWithChat],
            ['Errores recientes de conexion', summary.recentConnectionErrors],
          ].map(([label, value]) => (
            <article
              key={String(label)}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="text-sm font-semibold text-slate-600">{label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">Usuarios nuevos</h2>
              <Link href="/admin/users" className="text-sm font-semibold text-[#ff5460]">
                Ver usuarios
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {summary.recentUsers.map((user: HoldedRecentUser) => (
                <div
                  key={user.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="font-semibold text-slate-900">{user.email}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Alta: {formatAdminDate(user.createdAt)} · Verificado:{' '}
                    {user.emailVerified ? 'si' : 'no'}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">Actividad reciente</h2>
              <Link href="/admin/activity" className="text-sm font-semibold text-[#ff5460]">
                Ver actividad
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {summary.recentActivity.map((item: HoldedRecentActivity) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="font-semibold text-slate-900">{item.action}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.user?.email || 'Sin usuario'} · {item.tenant?.name || 'Sin tenant'} ·{' '}
                    {formatAdminDate(item.createdAt)}
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
