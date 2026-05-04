import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function fmtDate(value: Date | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-sm text-slate-500">{sub}</div> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'trial'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : status === 'cancelled' || status === 'past_due'
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>
  );
}

export default async function AdminIsaakPage() {
  const [tenantRows, totalMessages, totalConversations] = await Promise.all([
    // Per-tenant: conversations count, last conversation date, subscription, membership count
    prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        tenantSubscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true, trialEndsAt: true, plan: { select: { code: true, name: true } } },
        },
        isaakConversations: {
          orderBy: { updatedAt: 'desc' },
          select: { id: true, updatedAt: true, _count: { select: { messages: true } } },
        },
        users: {
          select: { user: { select: { id: true, email: true, firstName: true } } },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.isaakConversationMsg.count(),
    prisma.isaakConversation.count(),
  ]);

  // Derived stats
  const tenantsWithConversations = tenantRows.filter((t) => t.isaakConversations.length > 0);
  const activeToday = tenantRows.filter((t) => {
    const last = t.isaakConversations[0]?.updatedAt;
    if (!last) return false;
    return Date.now() - new Date(last).getTime() < 86_400_000;
  });

  // Sort by last activity desc
  const sorted = [...tenantRows].sort((a, b) => {
    const aLast = a.isaakConversations[0]?.updatedAt?.getTime() ?? 0;
    const bLast = b.isaakConversations[0]?.updatedAt?.getTime() ?? 0;
    return bLast - aLast;
  });

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Isaak — Usuarios</h1>
        <p className="text-sm text-slate-500">
          Actividad global de conversaciones, planes y uso por tenant.
        </p>
      </header>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tenants totales" value={tenantRows.length} />
        <StatCard
          label="Con conversaciones"
          value={tenantsWithConversations.length}
          sub={`${Math.round((tenantsWithConversations.length / Math.max(tenantRows.length, 1)) * 100)}% del total`}
        />
        <StatCard
          label="Conversaciones"
          value={totalConversations}
          sub={`${totalMessages} mensajes en total`}
        />
        <StatCard
          label="Activos hoy"
          value={activeToday.length}
          sub="con mensaje en las últimas 24h"
        />
      </div>

      {/* Tenant table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Todos los tenants ({tenantRows.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-widest text-slate-400">
                <th className="pb-2 text-left">Tenant</th>
                <th className="pb-2 text-left">Plan</th>
                <th className="pb-2 text-left">Estado</th>
                <th className="pb-2 text-right">Conversaciones</th>
                <th className="pb-2 text-right">Mensajes</th>
                <th className="pb-2 text-left">Última actividad</th>
                <th className="pb-2 text-left">Miembros</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((t) => {
                const sub = t.tenantSubscriptions[0];
                const lastConv = t.isaakConversations[0];
                const totalMsgs = t.isaakConversations.reduce(
                  (acc, c) => acc + c._count.messages,
                  0
                );
                const isRecentlyActive =
                  lastConv && Date.now() - new Date(lastConv.updatedAt).getTime() < 86_400_000;

                return (
                  <tr key={t.id} className={isRecentlyActive ? 'bg-emerald-50/30' : ''}>
                    <td className="py-2.5">
                      <Link
                        href={`/tenants/${t.id}/overview`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {t.name}
                      </Link>
                      <div className="font-mono text-xs text-slate-400">{t.id.slice(0, 8)}…</div>
                    </td>
                    <td className="py-2.5 text-slate-700">
                      {sub?.plan?.name ?? <span className="text-slate-400">Sin plan</span>}
                      {sub?.plan?.code ? (
                        <span className="ml-1 font-mono text-xs text-slate-400">
                          ({sub.plan.code})
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5">
                      {sub ? (
                        <StatusBadge status={sub.status} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      {t.isaakConversations.length}
                    </td>
                    <td className="py-2.5 text-right text-slate-600">{totalMsgs}</td>
                    <td className="py-2.5 text-slate-600">
                      {lastConv ? (
                        <span className={isRecentlyActive ? 'font-semibold text-emerald-700' : ''}>
                          {fmtDate(lastConv.updatedAt)}
                        </span>
                      ) : (
                        <span className="text-slate-400">Sin actividad</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="space-y-0.5">
                        {t.users.slice(0, 2).map((m) => (
                          <div key={m.user.id} className="text-xs text-slate-500">
                            {m.user.firstName ?? m.user.email}
                          </div>
                        ))}
                        {t.users.length > 2 ? (
                          <div className="text-xs text-slate-400">+{t.users.length - 2} más</div>
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

      {/* Tenants with no Isaak activity */}
      {tenantRows.length - tenantsWithConversations.length > 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-slate-600">
            Sin actividad en Isaak ({tenantRows.length - tenantsWithConversations.length} tenants)
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {tenantRows
              .filter((t) => t.isaakConversations.length === 0)
              .map((t) => (
                <Link
                  key={t.id}
                  href={`/tenants/${t.id}/overview`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  {t.name}
                </Link>
              ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
