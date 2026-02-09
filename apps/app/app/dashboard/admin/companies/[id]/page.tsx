'use client';

import { useToast } from '@/components/notifications/ToastNotifications';
import { EinformaAutofillButton } from '@/src/components/einforma/EinformaAutofillButton';
import { formatCurrency } from '@/src/lib/formatters';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type CompanyData = {
  id: string;
  name: string;
  legal_name: string;
  tax_id: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  created_at: string;
  members_count: number;
  invoices_count: number;
  total_revenue: number;
};

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const companyId =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [einformaMeta, setEinformaMeta] = useState<{
    cached?: boolean;
    cacheSource?: string | null;
    lastSyncAt?: string | null;
  } | null>(null);
  const [einformaSourceId, setEinformaSourceId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    tax_id: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'ES',
  });

  function applyNormalized(normalized: {
    name?: string | null;
    legalName?: string | null;
    nif?: string | null;
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    sourceId?: string | null;
  }) {
    setFormData((prev) => ({
      ...prev,
      name: prev.name || normalized.name || normalized.legalName || '',
      legal_name: prev.legal_name || normalized.legalName || normalized.name || '',
      tax_id: prev.tax_id || normalized.nif || '',
      address: prev.address || normalized.address || '',
      city: prev.city || normalized.city || '',
      postal_code: prev.postal_code || normalized.postalCode || '',
      country: prev.country || normalized.country || prev.country,
    }));
    setEinformaSourceId(normalized.sourceId ?? null);
  }

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    fetchCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function fetchCompany() {
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data);
        setFormData({
          name: data.name,
          legal_name: data.legal_name,
          tax_id: data.tax_id || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          country: data.country || 'ES',
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        success('Empresa actualizada', 'Los cambios se guardaron correctamente');
        fetchCompany();
      } else {
        showError('Error al actualizar', 'No se pudo actualizar la empresa');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error al actualizar', 'No se pudo actualizar la empresa');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de que deseas eliminar esta empresa?')) return;

    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        success('Empresa eliminada', 'La empresa se elimin\u00f3 correctamente');
        router.push('/dashboard/admin/companies');
      } else {
        showError('Error al eliminar', 'No se pudo eliminar la empresa');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error al eliminar', 'No se pudo eliminar la empresa');
    }
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center py-8">
        <p className="text-gray-600">Cargando empresa...</p>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="text-center py-8">
        <p className="text-gray-600">Empresa no encontrada</p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/admin/companies"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Editar Empresa</h1>
        <p className="text-sm text-gray-600">ID: {companyId}</p>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 sm:grid-cols-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div>
          <p className="text-sm text-gray-600">Usuarios</p>
          <p className="text-2xl font-bold text-gray-900">{company.members_count}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Facturas</p>
          <p className="text-2xl font-bold text-gray-900">{company.invoices_count}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Ingresos</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(company.total_revenue)}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6"
      >
        {/* Información Básica */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Información Básica</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="company-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre de Empresa
              </label>
              <input
                id="company-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="company-legal-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Razón Social
              </label>
              <input
                id="company-legal-name"
                type="text"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="company-tax-id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                NIF/CIF
              </label>
              <input
                id="company-tax-id"
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <EinformaAutofillButton
                taxIdValue={formData.tax_id}
                onApply={(normalized, meta) => {
                  applyNormalized(normalized);
                  setEinformaMeta(meta);
                }}
                endpoint="/api/admin/einforma/profile"
                refreshable
              />
              {einformaMeta?.lastSyncAt ? (
                <div className="mt-2 text-xs text-slate-500">
                  {einformaMeta.cached ? 'Snapshot (<=30 dias)' : 'eInforma (live)'} · Actualizado:{' '}
                  {einformaMeta.lastSyncAt}
                  {einformaSourceId ? ` · sourceId: ${einformaSourceId}` : ''}
                </div>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="company-email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="company-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Contacto</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="company-phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Teléfono
              </label>
              <input
                id="company-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="company-country"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                País
              </label>
              <select
                id="company-country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ES">España</option>
                <option value="PT">Portugal</option>
                <option value="FR">Francia</option>
                <option value="IT">Italia</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Dirección</h2>

          <div>
            <label
              htmlFor="company-address"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Calle
            </label>
            <input
              id="company-address"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="company-city"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Ciudad
              </label>
              <input
                id="company-city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="company-postal-code"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Código Postal
              </label>
              <input
                id="company-postal-code"
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar Empresa
          </button>

          <div className="flex gap-3">
            <Link
              href="/dashboard/admin/companies"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
