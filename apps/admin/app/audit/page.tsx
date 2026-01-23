import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  const search = typeof searchParams?.search === 'string' ? searchParams.search.trim() : '';
  const action = typeof searchParams?.action === 'string' ? searchParams.action : '';
  const date = typeof searchParams?.date === 'string' ? searchParams.date : '';

  const where: any = {};
  if (search) {
    where.OR = [
      { actorUser: { email: { contains: search, mode: 'insensitive' } } },
      { targetUser: { email: { contains: search, mode: 'insensitive' } } },
      { targetCompany: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (action) {
    where.action = action;
  }
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.createdAt = { gte: start, lt: end };
  }

  const audits = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      actorUser: { select: { email: true, name: true } },
      targetUser: { select: { email: true, name: true } },
      targetCompany: { select: { name: true } },
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-600 mt-1">Registro de actividad del sistema</p>
        </div>
      </div>

      <form method="get" className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <input
            type="text"
            name="search"
            placeholder="Buscar por usuario o empresa..."
            defaultValue={search}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            name="action"
            defaultValue={action}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas las acciones</option>
            <option value="ADMIN_LOGIN">Admin login</option>
            <option value="ADMIN_LOGOUT">Admin logout</option>
            <option value="IMPERSONATION_START">Inicio impersonación</option>
            <option value="IMPERSONATION_STOP">Fin impersonación</option>
            <option value="USER_BLOCK">Bloqueo usuario</option>
            <option value="USER_UNBLOCK">Desbloqueo usuario</option>
            <option value="WEBHOOK_RETRY">Reintento webhook</option>
            <option value="EMAIL_RETRY">Reintento email</option>
          </select>
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Buscar
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow p-6">
        {audits.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No hay registros de auditoría</div>
        ) : (
          <div className="space-y-3">
            {audits.map((item) => {
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
