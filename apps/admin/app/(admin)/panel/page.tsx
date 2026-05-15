import { ConnectorsPanelWidget } from '@/components/admin/ConnectorsPanelWidget';
import { prisma } from '@/lib/db';
import { getHoldedDirectPanelData } from '@/lib/holdedDirectAdmin';
import { formatDateTime } from '@/src/lib/formatters';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function MetricCard({
  label,
  value,
  sub,
  href,
  variant = 'default',
}: {
  label: string;
  value: number | string;
  sub?: string;
  href: string;
  variant?: 'default' | 'blue' | 'amber';
}) {
  const cardCls =
    variant === 'blue'
      ? 'border-[#2361d8]/20 bg-[#2361d8]/5 hover:border-[#2361d8]/40'
      : variant === 'amber'
        ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
        : 'border-slate-200 bg-white hover:border-slate-300';

  const valueCls =
    variant === 'blue'
      ? 'text-[#2361d8]'
      : variant === 'amber'
        ? 'text-amber-700'
        : 'text-slate-900';

  return (
    <Link
      href={href}
      className={`group block rounded-2xl border px-5 py-4 shadow-soft transition-colors ${cardCls}`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${valueCls}`}>{value}</p>
      {sub && (
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          {sub}
          <span className="opacity-0 transition-opacity group-hover:opacity-60">→</span>
        </p>
      )}
    </Link>
  );
}

export default async function AdminPanelPage() {
  const [data, pendingDemos, refreshedAt] = await Promise.all([
    getHoldedDirectPanelData({
      userLimit: 0,
      tenantLimit: 0,
      conversationLimit: 0,
      sessionLimit: 0,
    }),
    prisma.demoRequest.count({ where: { status: 'PENDING' } }).catch(() => 0),
    Promise.resolve(new Date().toISOString()),
  ]);

  const { summary } = data;

  return (
    <main className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Verifactu Business
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
            Panel de administración
          </h1>
        </div>
        <span className="hidden rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-500 sm:block">
          {formatDateTime(refreshedAt)}
        </span>
      </header>

      {/* Alertas */}
      {(summary.dueReminders > 0 || summary.duplicateEmailUsers > 0 || pendingDemos > 0) && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
          <p className="text-xs font-semibold text-amber-800">Atención requerida</p>
          <ul className="mt-1 space-y-0.5 text-xs text-amber-700">
            {pendingDemos > 0 && (
              <li>
                —{' '}
                <Link href="/demo-requests" className="underline hover:text-amber-900">
                  {pendingDemos} demo{pendingDemos > 1 ? 's' : ''} pendiente
                  {pendingDemos > 1 ? 's' : ''} de respuesta
                </Link>
              </li>
            )}
            {summary.dueReminders > 0 && (
              <li>
                — {summary.dueReminders} recordatorio{summary.dueReminders > 1 ? 's' : ''} pendiente
                {summary.dueReminders > 1 ? 's' : ''}
              </li>
            )}
            {summary.duplicateEmailUsers > 0 && (
              <li>
                — {summary.duplicateEmailUsers} usuario{summary.duplicateEmailUsers > 1 ? 's' : ''}{' '}
                con email duplicado
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Widget visual de conectores — hero del panel */}
      <ConnectorsPanelWidget />

      {/* KPIs — cada tarjeta enlaza a su sección */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Conectados"
            value={summary.connectedUsers}
            sub="usuarios activos"
            href="/users"
            variant="blue"
          />
          <MetricCard
            label="Tenants"
            value={summary.tenants}
            sub="empresas registradas"
            href="/tenants"
          />
          <MetricCard
            label="Demos pendientes"
            value={pendingDemos}
            sub="solicitudes sin atender"
            href="/demo-requests"
            variant={pendingDemos > 0 ? 'amber' : 'default'}
          />
          <MetricCard
            label="Sesiones activas"
            value={summary.activeSessions}
            sub="en este momento"
            href="/sessions"
          />
        </div>
      </section>
    </main>
  );
}
