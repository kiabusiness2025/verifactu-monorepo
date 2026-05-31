// V2.A.3 — Vista global de suscripciones del producto.
//
// Lista todas las TenantSubscription con filtros por estado y buscador
// por nombre/NIF del tenant. Pintamos KPIs agregados arriba (MRR, ARR,
// activas, trial, past_due, cancelled, churn 30d).
//
// Server-rendered con query string filters, mismo patrón que /connectors.

import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const ALL_STATUSES = ['active', 'trial', 'past_due', 'cancelled', 'paused', 'incomplete'] as const;
type Status = (typeof ALL_STATUSES)[number];

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  trial: 'Trial',
  past_due: 'Impago',
  cancelled: 'Cancelada',
  paused: 'Pausada',
  incomplete: 'Incompleta',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  trial: 'border-amber-200 bg-amber-50 text-amber-700',
  past_due: 'border-rose-200 bg-rose-50 text-rose-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-500',
  paused: 'border-blue-200 bg-blue-50 text-blue-700',
  incomplete: 'border-orange-200 bg-orange-50 text-orange-700',
};

function fmtMoney(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(value: Date | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short' }).format(value);
}

function daysUntil(value: Date | null): number | null {
  if (!value) return null;
  return Math.ceil((value.getTime() - Date.now()) / 86_400_000);
}

function KpiCard({
  label,
  value,
  sub,
  variant = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  variant?: 'default' | 'emerald' | 'amber' | 'rose';
}) {
  const cls =
    variant === 'emerald'
      ? 'border-emerald-200 bg-emerald-50'
      : variant === 'amber'
        ? 'border-amber-200 bg-amber-50'
        : variant === 'rose'
          ? 'border-rose-200 bg-rose-50'
          : 'border-slate-200 bg-white';
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${cls}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

async function loadData(filters: { status: Status | 'all'; search: string; page: number }) {
  const where: {
    status?: string;
    tenant?: { OR: Array<Record<string, { contains: string; mode: 'insensitive' }>> };
  } = {};
  if (filters.status !== 'all') where.status = filters.status;
  if (filters.search) {
    const s = filters.search.trim();
    if (s) {
      where.tenant = {
        OR: [
          { name: { contains: s, mode: 'insensitive' } },
          { nif: { contains: s, mode: 'insensitive' } },
        ],
      };
    }
  }

  const [list, total, aggregates] = await Promise.all([
    prisma.tenantSubscription.findMany({
      where,
      include: {
        plan: true,
        tenant: { select: { id: true, name: true, nif: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: PAGE_SIZE,
      skip: filters.page * PAGE_SIZE,
    }),
    prisma.tenantSubscription.count({ where }),
    prisma.tenantSubscription.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  // MRR = suma de fixedMonthly de suscripciones 'active'
  const activeSubs = await prisma.tenantSubscription.findMany({
    where: { status: 'active' },
    include: { plan: true },
  });
  const mrr = activeSubs.reduce((acc, s) => acc + Number(s.plan.fixedMonthly), 0);

  // Churn 30d: cancelled cuya updatedAt esté en últimos 30d
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const churned30d = await prisma.tenantSubscription.count({
    where: { status: 'cancelled', updatedAt: { gte: thirtyDaysAgo } },
  });

  const countByStatus: Record<string, number> = {};
  for (const row of aggregates) countByStatus[row.status] = row._count._all;

  return {
    list,
    total,
    mrr,
    churned30d,
    countByStatus,
  };
}

type PageProps = {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
};

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const statusParam = sp.status ?? 'all';
  const status: Status | 'all' = (ALL_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as Status)
    : 'all';
  const search = (sp.search ?? '').trim();
  const page = Math.max(0, Number(sp.page ?? '0') || 0);

  const { list, total, mrr, churned30d, countByStatus } = await loadData({ status, search, page });

  const activeCount = countByStatus.active ?? 0;
  const trialCount = countByStatus.trial ?? 0;
  const pastDueCount = countByStatus.past_due ?? 0;
  const cancelledCount = countByStatus.cancelled ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildHref = (extra: Record<string, string | number>) => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    if (page > 0) params.set('page', String(page));
    for (const [k, v] of Object.entries(extra)) {
      if (v === '' || v === 0) params.delete(k);
      else params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `/subscriptions?${qs}` : '/subscriptions';
  };

  return (
    <main className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Suscripciones</h1>
        <p className="mt-1 text-sm text-slate-600">
          Vista global de todas las suscripciones del producto (Stripe + plan asignado).
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="MRR" value={fmtMoney(mrr)} sub={`ARR ${fmtMoney(mrr * 12)}`} variant="emerald" />
        <KpiCard
          label="Activas"
          value={String(activeCount)}
          sub={`${cancelledCount} canceladas histórico`}
          variant="emerald"
        />
        <KpiCard label="En trial" value={String(trialCount)} variant="amber" />
        <KpiCard
          label="Impagos"
          value={String(pastDueCount)}
          variant={pastDueCount > 0 ? 'rose' : 'default'}
        />
        <KpiCard label="Churn 30d" value={String(churned30d)} variant={churned30d > 0 ? 'rose' : 'default'} />
      </section>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Estado
          </label>
          <select
            name="status"
            defaultValue={status}
            className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="all">Todos</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Buscar tenant
          </label>
          <input
            name="search"
            type="text"
            defaultValue={search}
            placeholder="Nombre o NIF…"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Filtrar
        </button>
        {(status !== 'all' || search) && (
          <Link
            href="/subscriptions"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Limpiar
          </Link>
        )}
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Tenant
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Plan
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Estado
              </th>
              <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:table-cell">
                Trial / período
              </th>
              <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:table-cell">
                Uso hoy
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  No hay suscripciones con esos filtros.
                </td>
              </tr>
            ) : (
              list.map((sub) => {
                const trialLeft = daysUntil(sub.trialEndsAt);
                const periodLeft = daysUntil(sub.currentPeriodEnd);
                const used = sub.queriesUsedToday;
                const limit = sub.dailyQueryLimit;
                return (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {sub.tenant.name ?? '—'}
                      </div>
                      {sub.tenant.nif && (
                        <div className="text-[11px] text-slate-500">NIF: {sub.tenant.nif}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{sub.plan.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {fmtMoney(Number(sub.plan.fixedMonthly))}/mes
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          STATUS_BADGE[sub.status] ?? 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {STATUS_LABEL[sub.status] ?? sub.status}
                      </span>
                      {sub.cancelAtPeriodEnd && (
                        <div className="mt-0.5 text-[10px] text-rose-600">cancela al final</div>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-slate-600 md:table-cell">
                      {sub.status === 'trial' && sub.trialEndsAt ? (
                        <>
                          Trial: {fmtDate(sub.trialEndsAt)}
                          {trialLeft !== null && (
                            <span className="ml-1 text-slate-400">({trialLeft}d)</span>
                          )}
                        </>
                      ) : sub.currentPeriodEnd ? (
                        <>
                          Renueva: {fmtDate(sub.currentPeriodEnd)}
                          {periodLeft !== null && (
                            <span className="ml-1 text-slate-400">({periodLeft}d)</span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-slate-600 md:table-cell">
                      {limit === -1 ? `${used} (sin límite)` : `${used} / ${limit}`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/tenants/${sub.tenant.id}/billing`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Detalle →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            <span>
              Página {page + 1} de {totalPages} · {total} suscripciones
            </span>
            <div className="flex items-center gap-1.5">
              {page > 0 && (
                <Link
                  href={buildHref({ page: page - 1 })}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50"
                >
                  ← Anterior
                </Link>
              )}
              {page + 1 < totalPages && (
                <Link
                  href={buildHref({ page: page + 1 })}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
