import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-sm text-slate-500">{sub}</div> : null}
    </div>
  );
}

function fmt(amount: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

function fmtDate(value: Date | string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(value));
}

export default async function AdminStripePage() {
  const [plans, subscriptions, expiringTrials] = await Promise.all([
    prisma.plan.findMany({ orderBy: { fixedMonthly: 'asc' } }),
    prisma.tenantSubscription.findMany({
      include: { plan: true, tenant: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.tenantSubscription.findMany({
      where: {
        status: 'trial',
        trialEndsAt: { lte: new Date(Date.now() + 7 * 86_400_000), gte: new Date() },
      },
      include: { plan: true },
      orderBy: { trialEndsAt: 'asc' },
    }),
  ]);

  const byStatus = subscriptions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  const activePaid = subscriptions.filter((s) => s.status === 'active');
  const mrr = activePaid.reduce((sum, s) => sum + Number(s.plan?.fixedMonthly ?? 0), 0);
  const arr = mrr * 12;

  const withStripe = subscriptions.filter((s) => Boolean(s.stripeCustomerId));
  const conversionRate =
    subscriptions.length > 0 ? Math.round((activePaid.length / subscriptions.length) * 100) : 0;

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Stripe &amp; Suscripciones</h1>
        <p className="mt-1 text-sm text-slate-600">
          Métricas de facturación desde la base de datos. Última actualización: en cada carga.
        </p>
      </header>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="MRR" value={fmt(mrr)} sub="ingresos mensuales recurrentes" />
        <StatCard label="ARR" value={fmt(arr)} sub="proyección anual" />
        <StatCard
          label="Suscripciones activas"
          value={activePaid.length}
          sub={`${conversionRate}% conversión trial→pago`}
        />
        <StatCard
          label="Trials activos"
          value={byStatus['trial'] ?? 0}
          sub={`${expiringTrials.length} expiran en 7 días`}
        />
      </div>

      {/* Status breakdown */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-base font-semibold text-slate-900">Estado de suscripciones</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(byStatus).map(([status, count]) => (
            <div
              key={status}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
            >
              <span className="font-semibold text-slate-900">{count}</span>{' '}
              <span className="text-slate-500">{status}</span>
            </div>
          ))}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm">
            <span className="font-semibold text-slate-900">{withStripe.length}</span>{' '}
            <span className="text-slate-500">con Stripe ID</span>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-base font-semibold text-slate-900">Planes configurados</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-widest text-slate-400">
                <th className="pb-2 text-left">Código</th>
                <th className="pb-2 text-left">Nombre</th>
                <th className="pb-2 text-right">Precio/mes</th>
                <th className="pb-2 text-right">Suscripciones activas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((plan) => {
                const planActive = activePaid.filter((s) => s.plan?.code === plan.code).length;
                return (
                  <tr key={plan.id}>
                    <td className="py-2.5 font-mono text-xs text-slate-600">{plan.code}</td>
                    <td className="py-2.5 font-medium text-slate-900">{plan.name}</td>
                    <td className="py-2.5 text-right text-slate-700">
                      {fmt(Number(plan.fixedMonthly))}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">{planActive}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Trials expiring soon */}
      {expiringTrials.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-base font-semibold text-amber-900">
            Trials expirando en 7 días ({expiringTrials.length})
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200 text-xs font-semibold uppercase tracking-widest text-amber-700">
                  <th className="pb-2 text-left">Tenant</th>
                  <th className="pb-2 text-left">Plan</th>
                  <th className="pb-2 text-left">Expira</th>
                  <th className="pb-2 text-left">Stripe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {expiringTrials.map((s) => {
                  const daysLeft = s.trialEndsAt
                    ? Math.max(0, Math.ceil((s.trialEndsAt.getTime() - Date.now()) / 86_400_000))
                    : null;
                  return (
                    <tr key={s.id}>
                      <td className="py-2 font-mono text-xs text-slate-700">{s.tenantId}</td>
                      <td className="py-2 text-slate-700">{s.plan?.name ?? '—'}</td>
                      <td className="py-2 font-medium text-amber-800">
                        {fmtDate(s.trialEndsAt)}{' '}
                        {daysLeft !== null ? <span className="text-xs">({daysLeft}d)</span> : null}
                      </td>
                      <td className="py-2 font-mono text-xs text-slate-500">
                        {s.stripeCustomerId ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Recent subscriptions */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-base font-semibold text-slate-900">
          Suscripciones recientes (últimas 30)
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-widest text-slate-400">
                <th className="pb-2 text-left">Tenant</th>
                <th className="pb-2 text-left">Plan</th>
                <th className="pb-2 text-left">Estado</th>
                <th className="pb-2 text-left">Trial expira</th>
                <th className="pb-2 text-left">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.slice(0, 30).map((s) => (
                <tr key={s.id}>
                  <td className="py-2 font-mono text-xs text-slate-600">{s.tenantId}</td>
                  <td className="py-2 text-slate-700">{s.plan?.name ?? '—'}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : s.status === 'trial'
                            ? 'bg-blue-50 text-blue-700'
                            : s.status === 'past_due'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2 text-slate-600">{fmtDate(s.trialEndsAt)}</td>
                  <td className="py-2 text-slate-500">{fmtDate(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
