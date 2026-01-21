import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '../api/auth/[...nextauth]/route';

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name || session?.user?.email;

  // TODO: Fetch real stats from database
  const stats = {
    totalUsers: 0,
    totalCompanies: 0,
    activeImpersonations: 0,
    recentAudits: 0,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bienvenido, {userName}</h1>
        <p className="text-gray-600 mt-2">Panel de administración de Verifactu Business</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Usuarios" value={stats.totalUsers} icon="👥" href="/users" />
        <StatCard title="Total Empresas" value={stats.totalCompanies} icon="🏢" href="/companies" />
        <StatCard
          title="Impersonaciones Activas"
          value={stats.activeImpersonations}
          icon="🔄"
          variant={stats.activeImpersonations > 0 ? 'warning' : 'default'}
        />
        <StatCard title="Auditorías Recientes" value={stats.recentAudits} icon="📝" href="/audit" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            href="/users"
            icon="👥"
            title="Ver Usuarios"
            description="Gestionar usuarios del sistema"
          />
          <QuickAction
            href="/companies"
            icon="🏢"
            title="Ver Empresas"
            description="Gestionar empresas y sus datos"
          />
          <QuickAction
            href="/audit"
            icon="📝"
            title="Ver Auditoría"
            description="Revisar logs de actividad"
          />
        </div>
      </div>

      {/* Recent Activity - TODO: Fetch from database */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
        <div className="text-gray-500 text-center py-8">No hay actividad reciente</div>
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
        <span className="text-2xl">{icon}</span>
        {variant === 'warning' && value > 0 && (
          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
            ⚠️ Activo
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
      <span className="text-3xl">{icon}</span>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </Link>
  );
}
