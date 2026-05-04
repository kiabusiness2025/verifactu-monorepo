import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { BillingActions } from './BillingActions';

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
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : status === 'past_due' || status === 'cancelled'
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classes}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-sm text-slate-500">{sub}</div> : null}
    </div>
  );
}

export default async function TenantBillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [tenant, subscriptions, plans] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    }),
    prisma.tenantSubscription.findMany({
      where: { tenantId: id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.plan.findMany({ orderBy: { fixedMonthly: 'asc' } }),
  ]);

  if (!tenant) notFound();

  const current = subscriptions[0] ?? null;

  const active = subscriptions.find(
    (s) => s.status === 'active' || s.status === 'trial' || s.status === 'past_due'
  );

  const daysUntilTrialEnd =
    active?.trialEndsAt && active.status === 'trial'
      ? Math.max(0, Math.ceil((active.trialEndsAt.getTime() - Date.now()) / 86_400_000))
      : null;

  const daysSinceCreation = current
    ? Math.floor((Date.now() - current.createdAt.getTime()) / 86_400_000)
    : null;

  return (
    <main className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Facturación del tenant</h2>
        <p className="text-sm text-slate-500">Estado de suscripción y datos Stripe.</p>
      </header>

      {subscriptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Este tenant no tiene ninguna suscripción registrada.
        </div>
      ) : (
        <>
          {/* Header plan card */}
          {current && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {current.plan?.name ?? '—'}
                  </h3>
                  <span className="mt-0.5 font-mono text-xs text-slate-500">
                    {current.plan?.code ?? '—'}
                  </span>
                </div>
                <StatusBadge status={current.status} />
              </div>

              {current.status === 'trial' && current.trialEndsAt ? (
                <div
                  className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-medium ${
                    daysUntilTrialEnd !== null && daysUntilTrialEnd <= 3
                      ? 'bg-rose-50 text-rose-800'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  Trial expira el {fmtDate(current.trialEndsAt)}
                  {daysUntilTrialEnd !== null ? ` (${daysUntilTrialEnd} días restantes)` : ''}
                </div>
              ) : null}

              {(current.status === 'active' || current.status === 'past_due') &&
              current.currentPeriodEnd ? (
                <div className="mt-3 rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-700">
                  Próxima renovación: <strong>{fmtDate(current.currentPeriodEnd)}</strong>
                </div>
              ) : null}

              {current.cancelAtPeriodEnd ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-800">
                  Cancelación programada al final del periodo actual.
                </div>
              ) : null}

              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: 'Estado Stripe', value: current.stripeStatus ?? '—' },
                  { label: 'Periodo inicio', value: fmtDate(current.currentPeriodStart) },
                  { label: 'Periodo fin', value: fmtDate(current.currentPeriodEnd) },
                  { label: 'Trial expira', value: fmtDate(current.trialEndsAt) },
                  {
                    label: 'Cancela al fin de periodo',
                    value: current.cancelAtPeriodEnd ? 'Sí' : 'No',
                  },
                  { label: 'Última actualización', value: fmtDate(current.updatedAt) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Stats row */}
          {current && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Precio / mes"
                value={fmtMoney(current.plan?.fixedMonthly?.toNumber() ?? null)}
                sub={current.plan?.code ?? undefined}
              />
              <StatCard label="Suscripción creada" value={fmtDate(current.createdAt)} />
              <StatCard
                label="Días activo"
                value={daysSinceCreation !== null ? String(daysSinceCreation) : '—'}
                sub="desde la creación"
              />
            </div>
          )}

          {/* Stripe section */}
          {current && (current.stripeCustomerId || current.stripeSubscriptionId) ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Stripe</h3>
              <div className="mt-4 space-y-3">
                {current.stripeCustomerId ? (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Customer ID
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <code className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-800 break-all">
                        {current.stripeCustomerId}
                      </code>
                      <a
                        href={`https://dashboard.stripe.com/customers/${current.stripeCustomerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Ver en Stripe →
                      </a>
                    </div>
                  </div>
                ) : null}

                {current.stripeSubscriptionId ? (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Subscription ID
                    </div>
                    <div className="mt-1">
                      <code className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-800 break-all">
                        {current.stripeSubscriptionId}
                      </code>
                    </div>
                  </div>
                ) : null}

                {current.stripePriceId ? (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Price ID
                    </div>
                    <div className="mt-1">
                      <code className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-800 break-all">
                        {current.stripePriceId}
                      </code>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* All subscriptions table */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Historial de suscripciones ({subscriptions.length})
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    <th className="pb-2 text-left">Plan</th>
                    <th className="pb-2 text-left">Estado</th>
                    <th className="pb-2 text-left">Inicio</th>
                    <th className="pb-2 text-left">Fin / Trial</th>
                    <th className="pb-2 text-left">Creada</th>
                    <th className="pb-2 text-left">Stripe IDs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 font-medium text-slate-900">
                        {s.plan?.name ?? '—'}
                        {s.plan?.code ? (
                          <span className="ml-1 font-mono text-xs text-slate-400">
                            ({s.plan.code})
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="py-2.5 text-slate-600">{fmtDate(s.currentPeriodStart)}</td>
                      <td className="py-2.5 text-slate-600">
                        {s.status === 'trial'
                          ? fmtDate(s.trialEndsAt)
                          : fmtDate(s.currentPeriodEnd)}
                      </td>
                      <td className="py-2.5 text-slate-500">{fmtDate(s.createdAt)}</td>
                      <td className="py-2.5">
                        <div className="space-y-0.5 font-mono text-xs text-slate-400">
                          {s.stripeCustomerId ? (
                            <div title="Customer ID">{s.stripeCustomerId}</div>
                          ) : null}
                          {s.stripeSubscriptionId ? (
                            <div title="Subscription ID">{s.stripeSubscriptionId}</div>
                          ) : null}
                          {!s.stripeCustomerId && !s.stripeSubscriptionId ? '—' : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Admin actions */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">Acciones manuales</h3>
            <BillingActions
              tenantId={id}
              currentStatus={active?.status ?? current?.status ?? ''}
              hasActiveSubscription={!!active}
              plans={plans.map((p) => ({ id: p.id, code: p.code, name: p.name }))}
            />
          </section>
        </>
      )}
    </main>
  );
}
