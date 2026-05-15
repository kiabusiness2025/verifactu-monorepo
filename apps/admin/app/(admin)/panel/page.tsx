import { ConnectorsPanelWidget } from '@/components/admin/ConnectorsPanelWidget';
import { prisma } from '@/lib/db';
import { getHoldedDirectPanelData } from '@/lib/holdedDirectAdmin';
import { formatDateTime } from '@/src/lib/formatters';
import {
  BarChart3,
  Bot,
  Building2,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Plug,
  ShoppingBag,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function MetricCard({
  label,
  value,
  sub,
  accent,
  href,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <div
      className={`rounded-2xl border px-5 py-4 shadow-soft transition-colors ${
        accent
          ? `border-[${accent}]/20 bg-[${accent}]/5`
          : 'border-slate-200 bg-white hover:border-slate-300'
      } ${href ? 'cursor-pointer' : ''}`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p
        className={`mt-1 text-3xl font-semibold tabular-nums ${
          accent ? `text-[${accent}]` : 'text-slate-900'
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

const QUICK_LINKS = [
  { href: '/users', label: 'Usuarios', Icon: Users },
  { href: '/tenants', label: 'Tenants', Icon: Building2 },
  { href: '/connectors/overview', label: 'Conectores', Icon: Plug },
  { href: '/orders', label: 'Pedidos', Icon: ShoppingBag },
  { href: '/fulfillment', label: 'Fulfillment', Icon: Zap },
  { href: '/admin-support', label: 'Soporte', Icon: LifeBuoy },
  { href: '/isaak', label: 'Isaak', Icon: Bot },
  { href: '/admin-marketing', label: 'Marketing', Icon: Megaphone },
  { href: '/admin-metrics', label: 'Métricas', Icon: BarChart3 },
  { href: '/admin-meetings', label: 'Reuniones', Icon: CalendarCheck },
  { href: '/admin-investors', label: 'Inversores', Icon: TrendingUp },
  { href: '/demo-requests', label: 'Demos', Icon: FileText },
  { href: '/admin-docs', label: 'Docs', Icon: LayoutDashboard },
];

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
      {/* Header — compact */}
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

      {/* Alert: atención requerida */}
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

      {/* KPIs */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Conectados"
            value={summary.connectedUsers}
            sub="usuarios activos"
            accent="#2361d8"
          />
          <MetricCard label="Tenants" value={summary.tenants} sub="empresas registradas" />
          <MetricCard
            label="Demos pendientes"
            value={pendingDemos}
            sub="solicitudes sin atender"
            href="/demo-requests"
            accent={pendingDemos > 0 ? '#d97706' : undefined}
          />
          <MetricCard
            label="Sesiones activas"
            value={summary.activeSessions}
            sub="en este momento"
          />
        </div>
      </section>

      {/* Connector visual widget — canal breakdown + mini chart */}
      <ConnectorsPanelWidget />

      {/* Quick access grid */}
      <section>
        <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Acceso rápido
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {QUICK_LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center shadow-sm transition-colors hover:border-[#2361d8]/30 hover:bg-[#2361d8]/5"
            >
              <Icon className="h-4 w-4 text-slate-500" />
              <span className="text-[11px] font-medium text-slate-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
