import type { Metadata } from 'next';
import { formatAdminDate, getHoldedAdminActivity } from '@/app/lib/holded-admin-data';

export const metadata: Metadata = {
  title: 'Actividad | Admin Holded',
  description: 'Actividad y eventos del embudo de activacion.',
};

export const dynamic = 'force-dynamic';

export default async function HoldedAdminActivityPage() {
  const items = await getHoldedAdminActivity();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_42%,#f8fafc_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Actividad</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Feed cronologico con registro, verificacion, login, conexion, onboarding y primer uso de
            Isaak.
          </p>
        </section>

        <section className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                  {item.type}
                </div>
                <div className="text-xs text-slate-500">{formatAdminDate(item.createdAt)}</div>
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-900">
                {item.user?.email || 'Sin usuario'} · {item.tenant?.name || 'Sin tenant'}
              </div>
              <div className="mt-1 text-sm text-slate-600">{item.detail}</div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
