import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AlertActions } from './AlertActions';

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
    status === 'pending'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : status === 'sent'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : status === 'read'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-500 border-slate-200';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const label = channel === 'in_app' ? 'in-app' : channel;
  return (
    <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600">
      {label}
    </span>
  );
}

export default async function AdminIsaakAlertsPage() {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86_400_000);

  const [alerts, pendingCount, sentCount, dueSoonCount] = await Promise.all([
    prisma.isaakAlert.findMany({
      include: { tenant: { select: { id: true, name: true } } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    }),
    prisma.isaakAlert.count({ where: { status: 'pending' } }),
    prisma.isaakAlert.count({ where: { status: 'sent' } }),
    prisma.isaakAlert.count({
      where: { status: 'pending', dueDate: { lte: in7Days, gte: now } },
    }),
  ]);

  const totalAlerts = alerts.length;
  const overdueCount = alerts.filter(
    (a) => a.status === 'pending' && a.dueDate && new Date(a.dueDate) < now
  ).length;

  return (
    <main className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <div className="mb-1 text-xs text-slate-400">
            <Link href="/isaak" className="hover:underline">
              Isaak
            </Link>{' '}
            / Alertas
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Cola de notificaciones</h1>
          <p className="text-sm text-slate-500">
            Alertas pendientes, enviadas y programadas por tenant.
          </p>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total alertas" value={totalAlerts} />
        <StatCard
          label="Pendientes"
          value={pendingCount}
          sub={overdueCount > 0 ? `${overdueCount} vencidas` : 'Al día'}
        />
        <StatCard label="Vencen esta semana" value={dueSoonCount} sub="próximos 7 días" />
        <StatCard label="Enviadas" value={sentCount} />
      </div>

      {/* Overdue banner */}
      {overdueCount > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <span className="text-base">⚠️</span>
          <span>
            Hay <strong>{overdueCount}</strong> alerta{overdueCount !== 1 ? 's' : ''} vencida
            {overdueCount !== 1 ? 's' : ''} sin enviar.
          </span>
        </div>
      ) : null}

      {/* Alerts table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Todas las alertas ({totalAlerts})
        </h2>
        {alerts.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No hay alertas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <th className="pb-2 text-left">Tenant</th>
                  <th className="pb-2 text-left">Tipo</th>
                  <th className="pb-2 text-left">Título</th>
                  <th className="pb-2 text-left">Canal</th>
                  <th className="pb-2 text-left">Estado</th>
                  <th className="pb-2 text-left">Vencimiento</th>
                  <th className="pb-2 text-left">Enviada</th>
                  <th className="pb-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.map((alert) => {
                  const isOverdue =
                    alert.status === 'pending' && alert.dueDate && new Date(alert.dueDate) < now;
                  return (
                    <tr key={alert.id} className={isOverdue ? 'bg-rose-50/40' : ''}>
                      <td className="py-2.5">
                        <Link
                          href={`/tenants/${alert.tenant.id}/overview`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {alert.tenant.name}
                        </Link>
                      </td>
                      <td className="py-2.5">
                        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600">
                          {alert.type}
                        </span>
                      </td>
                      <td className="max-w-xs py-2.5">
                        <div className="truncate text-slate-800">{alert.title}</div>
                        <div className="truncate text-xs text-slate-400">{alert.body}</div>
                      </td>
                      <td className="py-2.5">
                        <ChannelBadge channel={alert.channel} />
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={alert.status} />
                      </td>
                      <td className="py-2.5">
                        <span
                          className={isOverdue ? 'font-semibold text-rose-700' : 'text-slate-600'}
                        >
                          {fmtDate(alert.dueDate)}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500">{fmtDate(alert.sentAt)}</td>
                      <td className="py-2.5">
                        {alert.status === 'pending' ? (
                          <AlertActions alertId={alert.id} />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
