import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(value)
  );
}

function fmtMoney(value: number | string | null | undefined) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(num);
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'trial'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : status === 'past_due'
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes}`}>
      {status}
    </span>
  );
}

export default async function TenantBillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [tenant, subscriptions] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    }),
    prisma.tenantSubscription.findMany({
      where: { tenantId: id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  if (!tenant) notFound();

  const active = subscriptions.find(
    (s) => s.status === 'active' || s.status === 'trial' || s.status === 'past_due'
  );

  const daysUntilTrialEnd =
    active?.trialEndsAt && active.status === 'trial'
      ? Math.max(0, Math.ceil((active.trialEndsAt.getTime() - Date.now()) / 86_400_000))
      : null;

  return (
    <main className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Facturación del tenant</h2>
        <p className="text-sm text-slate-500">Estado de suscripción y datos Stripe.</p>
      </header>

      {/* Active subscription */}
      {active ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-slate-900">Suscripción activa</h3>
            <StatusBadge status={active.status} />
          </div>

          {active.status === 'trial' && daysUntilTrialEnd !== null ? (
            <div
              className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-medium ${
                daysUntilTrialEnd <= 3
                  ? 'bg-rose-50 text-rose-800'
                  : daysUntilTrialEnd <= 7
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-blue-50 text-blue-800'
              }`}
            >
              Trial expira en {daysUntilTrialEnd} días ({fmtDate(active.trialEndsAt)})
            </div>
          ) : null}

          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Plan', value: active.plan?.name ?? '—' },
              { label: 'Código', value: active.plan?.code ?? '—' },
              {
                label: 'Precio/mes',
                value: fmtMoney(active.plan?.fixedMonthly?.toNumber() ?? null),
              },
              { label: 'Estado Stripe', value: active.stripeStatus ?? '—' },
              { label: 'Periodo inicio', value: fmtDate(active.currentPeriodStart) },
              { label: 'Periodo fin', value: fmtDate(active.currentPeriodEnd) },
              { label: 'Trial expira', value: fmtDate(active.trialEndsAt) },
              {
                label: 'Cancela al fin de periodo',
                value: active.cancelAtPeriodEnd ? 'Sí' : 'No',
              },
              { label: 'Creada', value: fmtDate(active.createdAt) },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Stripe IDs */}
          <div className="mt-5 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              IDs Stripe
            </div>
            {[
              { label: 'Customer ID', value: active.stripeCustomerId },
              { label: 'Subscription ID', value: active.stripeSubscriptionId },
              { label: 'Price ID', value: active.stripePriceId },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-baseline gap-2 text-sm">
                <span className="w-32 shrink-0 text-xs text-slate-500">{label}</span>
                <span className="break-all font-mono text-xs text-slate-700">{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Este tenant no tiene ninguna suscripción registrada.
        </div>
      )}

      {/* All subscriptions history */}
      {subscriptions.length > 1 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-base font-semibold text-slate-900">
            Historial de suscripciones ({subscriptions.length})
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <th className="pb-2 text-left">Plan</th>
                  <th className="pb-2 text-left">Estado</th>
                  <th className="pb-2 text-left">Trial expira</th>
                  <th className="pb-2 text-left">Periodo fin</th>
                  <th className="pb-2 text-left">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 text-slate-700">{s.plan?.name ?? '—'}</td>
                    <td className="py-2">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-2 text-slate-600">{fmtDate(s.trialEndsAt)}</td>
                    <td className="py-2 text-slate-600">{fmtDate(s.currentPeriodEnd)}</td>
                    <td className="py-2 text-slate-500">{fmtDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Actions placeholder */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold text-slate-900">Acciones manuales</h3>
        <p className="mt-1 text-sm text-slate-500">
          Próximamente: extender trial, cambiar plan, cancelar suscripción.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-2.5 text-sm text-slate-400">
            Extender trial +7 días
          </div>
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-2.5 text-sm text-slate-400">
            Cambiar plan
          </div>
          <div className="rounded-xl border border-dashed border-rose-200 px-4 py-2.5 text-sm text-rose-300">
            Cancelar suscripción
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Para acciones urgentes usa el{' '}
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Stripe Dashboard
          </a>{' '}
          directamente con el Customer ID de arriba.
        </p>
      </section>
    </main>
  );
}
