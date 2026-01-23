import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  const search = typeof searchParams?.search === 'string' ? searchParams.search.trim() : '';
  const role = typeof searchParams?.role === 'string' ? searchParams.role : '';

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) {
    where.role = role;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { companiesOwned: true } },
      subscriptions: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-600 mt-1">Gestión de usuarios del sistema</p>
        </div>
      </div>

      <form method="get" className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            type="text"
            name="search"
            placeholder="Buscar por email o nombre..."
            defaultValue={search}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            name="role"
            defaultValue={role}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPPORT">SUPPORT</option>
            <option value="USER">USER</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Buscar
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Empresas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Última actividad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Suscripción
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No hay usuarios para mostrar
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{user.name || 'Sin nombre'}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{user.role}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {user._count.companiesOwned}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {format(new Date(user.updatedAt), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {user.subscriptions[0]?.status || 'NONE'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <Link href={`/users/${user.id}`} className="text-blue-600 hover:text-blue-800">
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
