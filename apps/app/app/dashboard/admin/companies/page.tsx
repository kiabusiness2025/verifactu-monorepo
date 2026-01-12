"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Users, TrendingUp, Plus, Pencil, Trash2 } from "lucide-react";

type Tenant = {
  id: string;
  name: string;
  legal_name: string;
  created_at: string;
  members_count: number;
  invoices_count: number;
  total_revenue: number;
};

export default function CompaniesListPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
      }
    } catch (error) {
      console.error("Error fetching tenants:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.legal_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-600">Total: {tenants.length} empresas activas</p>
        </div>
        <Link
          href="/dashboard/admin/companies/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva Empresa
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Empresas</p>
              <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.reduce((acc, t) => acc + (t.members_count || 0), 0)}
              </p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {tenants.reduce((acc, t) => acc + (t.total_revenue || 0), 0).toLocaleString()}€
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <input
          type="text"
          placeholder="Buscar por nombre o razón social..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Listado */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Cargando empresas...</p>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-gray-200 bg-gray-50">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No hay empresas que mostrar</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Razón Social</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Usuarios</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Facturas</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Ingresos</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{tenant.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tenant.legal_name}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600">{tenant.members_count}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600">{tenant.invoices_count}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {tenant.total_revenue.toLocaleString()}€
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <Link
                        href={`/dashboard/admin/companies/${tenant.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Link>
                      <button className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm">
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
