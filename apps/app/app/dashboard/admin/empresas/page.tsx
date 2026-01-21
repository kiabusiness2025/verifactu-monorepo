'use client';

import { adminDelete, adminGet, adminPatch, adminPost, type TenantRow } from '@/lib/adminApi';
import { formatCurrency, formatNumber } from '@/src/lib/formatters';
import { Building2, Pencil, Plus, Trash2, TrendingUp, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/notifications/ToastNotifications';

type Tenant = TenantRow & {
  members_count: number;
  invoices_count: number;
  total_revenue: number;
};

export default function AdminEmpresasPage() {
  const { success, error: showError } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    legalName: '',
    taxId: '',
    address: '',
    cnae: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const data = await adminGet<{ ok: boolean; tenants: Tenant[] }>('/api/admin/tenants');
      setTenants(data.tenants || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingTenant(null);
    setFormData({ legalName: '', taxId: '', address: '', cnae: '' });
    setError('');
    setShowModal(true);
  }

  function openEditModal(tenant: Tenant) {
    setEditingTenant(tenant);
    setFormData({
      legalName: tenant.legalName || '',
      taxId: tenant.taxId || '',
      address: tenant.address || '',
      cnae: tenant.cnae || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (editingTenant) {
        // Editar
        const data = await adminPatch<{ ok: boolean; tenant: Tenant }>(
          `/api/admin/tenants/${editingTenant.id}`,
          formData
        );
        setTenants(tenants.map((t) => (t.id === editingTenant.id ? data.tenant : t)));
      } else {
        // Crear
        const data = await adminPost<{ ok: boolean; tenant: Tenant }>(
          '/api/admin/tenants',
          formData
        );
        setTenants([data.tenant, ...tenants]);
      }
      setShowModal(false);
      setFormData({ legalName: '', taxId: '', address: '', cnae: '' });
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tenant: Tenant) {
    if (
      !confirm(
        `¿Eliminar "${tenant.legalName}"?\n\nEsta acción no se puede deshacer.\n\nSi tiene facturas asociadas, no se podrá eliminar.`
      )
    ) {
      return;
    }

    try {
      await adminDelete(`/api/admin/tenants/${tenant.id}`);
      setTenants(tenants.filter((t) => t.id !== tenant.id));
      success('Empresa eliminada', 'La empresa se eliminó correctamente');
    } catch (err: any) {
      showError('Error al eliminar', err.message || 'No se pudo eliminar la empresa');
    }
  }

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Empresas</h1>
          <p className="text-sm text-gray-600">Total: {tenants.length} empresas activas</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Crear Empresa
        </button>
      </header>

      {/* KPIs Globales */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Empresas</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(tenants.length)}</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(tenants.reduce((acc, t) => acc + (t.members_count || 0), 0))}
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
                {formatCurrency(tenants.reduce((acc, t) => acc + (t.total_revenue || 0), 0))}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Lista de empresas */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando empresas...</div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No hay empresas registradas.{' '}
          <button onClick={openCreateModal} className="text-blue-600 hover:underline">
            Crear la primera
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{tenant.legalName}</h3>
                  </div>
                  {tenant.taxId && (
                    <p className="text-xs text-gray-500 mt-1">CIF/NIF: {tenant.taxId}</p>
                  )}
                  {tenant.address && <p className="text-xs text-gray-500">{tenant.address}</p>}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>Usuarios: {formatNumber(tenant.members_count)}</span>
                    <span>Facturas: {formatNumber(tenant.invoices_count)}</span>
                    <span>Ingresos: {formatCurrency(tenant.total_revenue)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(tenant)}
                    aria-label={`Editar ${tenant.legalName}`}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tenant)}
                    aria-label={`Eliminar ${tenant.legalName}`}
                    className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTenant ? 'Editar Empresa' : 'Crear Empresa'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Cerrar modal"
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Legal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.legalName}
                  onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ejemplo SL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CIF/NIF <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="B12345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Calle Principal 123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNAE</label>
                <input
                  type="text"
                  value={formData.cnae}
                  onChange={(e) => setFormData({ ...formData, cnae: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="6201"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {saving ? 'Guardando...' : editingTenant ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
