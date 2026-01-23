import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  const search = typeof searchParams?.search === 'string' ? searchParams.search.trim() : '';

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { taxId: { contains: search, mode: 'insensitive' } },
    ];
  }

  const companies = await prisma.company.findMany({
    where,
    select: {
      id: true,
      name: true,
      taxId: true,
      createdAt: true,
      owner: { select: { email: true, name: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-600 mt-1">Gestión de empresas del sistema</p>
        </div>
      </div>

      <form method="get" className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            type="text"
            name="search"
            placeholder="Buscar por nombre o CIF..."
            defaultValue={search}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="hidden md:block" />
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
                Empresa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CIF
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Propietario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Miembros
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Creada
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No hay empresas para mostrar
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{company.name}</div>
                    <div className="text-sm text-gray-500">ID: {company.id}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {company.taxId || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div>{company.owner?.name || 'Sin nombre'}</div>
                    <div className="text-xs text-gray-500">{company.owner?.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {company._count.members}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {format(new Date(company.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <Link
                      href={`/companies/${company.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
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
