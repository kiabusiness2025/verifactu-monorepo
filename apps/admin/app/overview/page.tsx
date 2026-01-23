import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  const userName = session.user?.name || session.user?.email;
  const now = new Date();
  const since24h = subDays(now, 1);
  const since7d = subDays(now, 7);

  const [totalUsers, totalCompanies, recentAudits, impersonations24h, recentActivity] =
    await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: since7d } } }),
      prisma.auditLog.count({
        where: { action: 'IMPERSONATION_START', createdAt: { gte: since24h } },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          actorUser: { select: { email: true, name: true } },
          targetUser: { select: { email: true, name: true } },
          targetCompany: { select: { name: true } },
        },
      }),
    ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bienvenido, {userName}</h1>
        <p className="mt-2 text-gray-600">Panel de administración de Verifactu Business</p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Usuarios" value={totalUsers} icon="U" href="/users" />
        <StatCard title="Total Empresas" value={totalCompanies} icon="E" href="/companies" />
        <StatCard
          title="Impersonaciones (24h)"
          value={impersonations24h}
          icon="I"
          variant={impersonations24h > 0 ? 'warning' : 'default'}
        />
        <StatCard title="Auditorías (7 días)" value={recentAudits} icon="A" href="/audit" />
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <QuickAction
            href="/users"
            icon="U"
            title="Ver Usuarios"
            description="Gestionar usuarios del sistema"
          />
          <QuickAction
            href="/companies"
            icon="E"
            title="Ver Empresas"
            description="Gestionar empresas y sus datos"
          />
          <QuickAction
            href="/audit"
            icon="A"
            title="Ver Auditoría"
            description="Revisar logs de actividad"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Actividad reciente</h2>
        {recentActivity.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No hay actividad reciente</div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item) => {
              const actor = item.actorUser?.name || item.actorUser?.email || 'Sistema';
              const target =
                item.targetUser?.email ||
                item.targetCompany?.name ||
                item.targetCompanyId ||
                item.targetUserId ||
                'N/A';
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 rounded-lg border border-gray-100 p-3"
                >
                  <div className="text-sm text-gray-800">
                    <span className="font-semibold">{actor}</span> · {item.action}
                  </div>
                  <div className="text-xs text-gray-500">
                    Objetivo: {target} · {format(new Date(item.createdAt), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  href,
  variant = 'default',
}: {
  title: string;
  value: number;
  icon: string;
  href?: string;
  variant?: 'default' | 'warning';
}) {
  const bgColor = variant === 'warning' ? 'bg-amber-50' : 'bg-white';
  const borderColor = variant === 'warning' ? 'border-amber-200' : 'border-gray-200';

  const content = (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl font-semibold text-slate-700">{icon}</span>
        {variant === 'warning' && value > 0 && (
          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
            Activo
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${bgColor} border ${borderColor} rounded-lg shadow p-6 hover:shadow-md transition-shadow`}
      >
        {content}
      </Link>
    );
  }

  return <div className={`${bgColor} border ${borderColor} rounded-lg shadow p-6`}>{content}</div>;
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
    >
      <span className="text-2xl font-semibold text-slate-700">{icon}</span>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </Link>
  );
}
