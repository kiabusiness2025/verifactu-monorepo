import {
  HoldedDirectTenantsSection,
  HoldedDirectUsersSection,
} from '@/components/admin/HoldedDirectControlSections';
import { prisma } from '@/lib/db';
import { getHoldedDirectPanelData } from '@/lib/holdedDirectAdmin';
import { formatDateTime } from '@/src/lib/formatters';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 shadow-soft ${
        accent ? 'border-[#2361d8]/20 bg-[#2361d8]/5' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p
        className={`mt-1 text-3xl font-semibold tabular-nums ${
          accent ? 'text-[#2361d8]' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

async function getRecentActivity() {
  try {
    const auditLogs = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: {
          select: { email: true, role: true },
        },
        targetUser: {
          select: { email: true },
        },
        targetCompany: {
          select: { name: true, taxId: true },
        },
      },
    });
    return auditLogs;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

const anchors = [
  { href: '#usuarios', label: 'Usuarios' },
  { href: '#tenants', label: 'Tenants' },
  { href: '#actividad', label: 'Actividad' },
];

export default async function AdminPanelPage() {
  const [data, refreshedAt, recentActivity] = await Promise.all([
    getHoldedDirectPanelData({
      userLimit: 8,
      tenantLimit: 8,
      conversationLimit: 0,
      sessionLimit: 0,
    }),
    Promise.resolve(new Date().toISOString()),
    getRecentActivity(),
  ]);

  const { summary } = data;

  return (
    <main className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="rounded-[32px] border border-slate-200 bg-white px-5 py-5 shadow-soft sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Verifactu Business
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Panel de administración
            </h1>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Vista operativa de usuarios, tenants y actividad reciente del producto.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Actualizado {formatDateTime(refreshedAt)}
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {anchors.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </a>
          ))}
        </div>
      </header>

      {/* Métricas principales */}
      <section>
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Resumen
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Conectados"
            value={summary.connectedUsers}
            sub="usuarios con conexión activa"
            accent
          />
          <MetricCard
            label="Desconectados"
            value={summary.disconnectedUsers}
            sub="sin conexión activa"
          />
          <MetricCard label="Tenants" value={summary.tenants} sub="empresas registradas" />
          <MetricCard
            label="Sesiones activas"
            value={summary.activeSessions}
            sub="en este momento"
          />
        </div>
      </section>

      {/* Recordatorios / alertas */}
      {(summary.dueReminders > 0 || summary.duplicateEmailUsers > 0) && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800">Atención requerida</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-700">
            {summary.dueReminders > 0 && (
              <li>
                — {summary.dueReminders} recordatorio{summary.dueReminders > 1 ? 's' : ''} pendiente
                {summary.dueReminders > 1 ? 's' : ''} de envío
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

      {/* Accesos rápidos */}
      <section>
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Gestión
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { href: '/users', label: 'Usuarios', desc: 'Estado de conexión y perfil' },
            { href: '/tenants', label: 'Tenants', desc: 'Empresas y actividad' },
            { href: '/admin-orders', label: 'Pedidos', desc: 'Cola de pedidos y fulfillment' },
            { href: '/admin-support', label: 'Soporte', desc: 'Tickets abiertos' },
            { href: '/admin-marketing', label: 'Marketing', desc: 'Email, redes, YouTube' },
            { href: '/admin-metrics', label: 'Métricas', desc: 'Datos de crecimiento' },
            { href: '/admin-meetings', label: 'Reuniones', desc: 'Citas con clientes' },
            { href: '/admin-investors', label: 'Inversores', desc: 'Documentos y actualizaciones' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:border-[#2361d8]/30 hover:bg-[#2361d8]/5 transition-colors"
            >
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Actividad reciente */}
      <section id="actividad">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Actividad reciente
          </h2>
          <Link
            href="/audit"
            className="text-xs font-semibold text-[#2361d8] hover:text-[#2361d8]/80"
          >
            Ver todo →
          </Link>
        </div>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {recentActivity.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              No hay actividad reciente
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivity.map((log: any) => (
                <div key={log.id} className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Por {log.actorUser?.email || 'Usuario desconocido'}
                      </p>
                      {log.targetUser && (
                        <p className="mt-1 text-xs text-slate-600">
                          Usuario: {log.targetUser.email}
                        </p>
                      )}
                      {log.targetCompany && (
                        <p className="mt-1 text-xs text-slate-600">
                          Empresa: {log.targetCompany.name} ({log.targetCompany.taxId})
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tablas operativas */}
      <HoldedDirectUsersSection
        id="usuarios"
        title="Usuarios del conector"
        description="Quien mantiene conexion activa o desconectada y sobre que tenants opera."
        users={data.users}
        viewAllHref="/users"
      />

      <HoldedDirectTenantsSection
        id="tenants"
        title="Tenants con actividad"
        description="Estado por empresa, ultima validacion y usuarios relacionados."
        tenants={data.tenants}
        viewAllHref="/tenants"
      />
    </main>
  );
}
