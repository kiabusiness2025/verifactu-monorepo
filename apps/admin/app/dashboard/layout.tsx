import { IMPERSONATION_COOKIE_NAME, verifyImpersonationToken } from '@/lib/cookies';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  // Check impersonation status
  const cookieStore = cookies();
  const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);
  let impersonationStatus = null;

  if (impersonationCookie) {
    const payload = await verifyImpersonationToken(impersonationCookie.value);
    if (payload) {
      impersonationStatus = {
        targetUserId: payload.targetUserId,
        targetCompanyId: payload.targetCompanyId,
        startedAt: new Date(payload.startedAt),
      };
    }
  }

  const userRole = (session.user as any).role;
  const userName = session.user?.name || session.user?.email;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Impersonation Banner */}
      {impersonationStatus && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center font-medium">
          ⚠️ Modo Impersonación Activa - Usuario: {impersonationStatus.targetUserId}
          {impersonationStatus.targetCompanyId &&
            ` | Empresa: ${impersonationStatus.targetCompanyId}`}
          <form action="/api/admin/impersonation/stop" method="POST" className="inline ml-4">
            <button
              type="submit"
              className="bg-white text-amber-600 px-3 py-1 rounded text-sm font-semibold hover:bg-amber-50"
            >
              Detener Impersonación
            </button>
          </form>
        </div>
      )}

      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-1">Verifactu Business</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <NavLink href="/overview" icon="📊">
              Overview
            </NavLink>
            <NavLink href="/users" icon="👥">
              Usuarios
            </NavLink>
            <NavLink href="/companies" icon="🏢">
              Empresas
            </NavLink>
            <NavLink href="/operations" icon="⚙️">
              Operations
            </NavLink>
            <NavLink href="/audit" icon="📝">
              Audit Log
            </NavLink>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {userName?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500">{userRole}</p>
              </div>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="w-full text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-left"
              >
                Cerrar Sesión
              </button>
            </form>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
    >
      <span className="text-lg">{icon}</span>
      {children}
    </Link>
  );
}
