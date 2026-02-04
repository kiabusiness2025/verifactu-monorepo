'use client';

import { EInformaSearch } from '@/components/companies/EInformaSearch';
import { useToast } from '@/components/notifications/ToastNotifications';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewCompanyPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
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
    cnae: '',
    incorporation_date: '',
    province: '',
    representative: '',
    source: 'manual',
    source_id: '',
  });
  const [einformaExtra, setEinformaExtra] = useState<{
    tradeName?: string;
    legalForm?: string;
    status?: string;
    employees?: number;
    sales?: number;
    salesYear?: number;
    capitalSocial?: number;
    lastBalanceDate?: string;
    website?: string;
  } | null>(null);

  const formatDateInput = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 10);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        success('Empresa creada', 'La empresa se cre\u00f3 correctamente');
        router.push(`/dashboard/admin/companies/${data.id}`);
      } else {
        showError('Error al crear empresa', 'No se pudo crear la empresa');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error al crear empresa', 'No se pudo crear la empresa');
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-2xl font-semibold text-gray-900">Nueva Empresa</h1>
        <p className="text-sm text-gray-600">Crear una nueva empresa en el sistema</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6"
      >
        {/* Buscador eInforma */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                Buscar empresa en eInforma
              </h3>
              <p className="text-xs text-blue-700 mb-3">
                Busca por nombre o CIF y autocompletaremos los datos de la empresa
              </p>
              <EInformaSearch
                onSelect={async (company) => {
                  try {
                    const nifOrId = company.nif || company.id || '';
                    if (!nifOrId) {
                      setFormData((prev) => ({ ...prev, name: company.name }));
                      success('Empresa encontrada', `Datos de ${company.name} autocompletados`);
                      return;
                    }

                    const res = await fetch(
                      `/api/admin/einforma/profile?nif=${encodeURIComponent(nifOrId)}`
                    );
                    const data = await res.json();
                    const profile = data?.profile;

                    if (!res.ok || !profile) {
                      setFormData((prev) => ({
                        ...prev,
                        name: company.name,
                        tax_id: company.nif || '',
                      }));
                      showError('No se pudo cargar la ficha', 'Completa los datos manualmente');
                      return;
                    }

                    setFormData({
                      name: profile.name || company.name,
                      legal_name: profile.legalName || '',
                      tax_id: profile.nif || company.nif || '',
                      email: profile.email || '',
                      phone: profile.phone || '',
                      address: profile.address?.street || '',
                      city: profile.address?.city || '',
                      postal_code: profile.address?.zip || '',
                      country: profile.address?.country || 'ES',
                      cnae: profile.cnae || '',
                      incorporation_date: formatDateInput(profile.constitutionDate),
                      province: profile.address?.province || '',
                      representative: profile.representatives?.[0]?.name || '',
                      source: 'einforma',
                      source_id: profile.sourceId || company.id || profile.nif || '',
                    });
                    setEinformaExtra({
                      tradeName: profile.tradeName,
                      legalForm: profile.legalForm,
                      status: profile.status,
                      employees: profile.employees,
                      sales: profile.sales,
                      salesYear: profile.salesYear,
                      capitalSocial: profile.capitalSocial,
                      lastBalanceDate: profile.lastBalanceDate,
                      website: profile.website,
                    });
                    success(
                      'Empresa encontrada',
                      `Datos de ${profile.name || company.name} autocompletados`
                    );
                  } catch (error) {
                    console.error('eInforma profile error:', error);
                    setFormData((prev) => ({
                      ...prev,
                      name: company.name,
                      tax_id: company.nif || '',
                    }));
                    showError('Error al consultar eInforma', 'Completa los datos manualmente');
                  }
                }}
              />
            </div>
          </div>
        </div>
        {/* Información Básica */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Información Básica</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-company-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre de Empresa
              </label>
              <input
                id="new-company-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="new-company-legal-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Razón Social
              </label>
              <input
                id="new-company-legal-name"
                type="text"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="new-company-tax-id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                NIF/CIF
              </label>
              <input
                id="new-company-tax-id"
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="new-company-email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="new-company-email"
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
                htmlFor="new-company-phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Teléfono
              </label>
              <input
                id="new-company-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="new-company-country"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                País
              </label>
              <select
                id="new-company-country"
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
              htmlFor="new-company-address"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Calle
            </label>
            <input
              id="new-company-address"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="new-company-city"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Ciudad
              </label>
              <input
                id="new-company-city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="new-company-postal-code"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Código Postal
              </label>
              <input
                id="new-company-postal-code"
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        {/* Datos fiscales eInforma */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Datos fiscales eInforma</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-company-cnae"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                CNAE
              </label>
              <input
                id="new-company-cnae"
                type="text"
                value={formData.cnae}
                onChange={(e) => setFormData({ ...formData, cnae: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="new-company-incorporation-date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Fecha de constitución
              </label>
              <input
                id="new-company-incorporation-date"
                type="date"
                value={formData.incorporation_date}
                onChange={(e) => setFormData({ ...formData, incorporation_date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="new-company-province"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Provincia
              </label>
              <input
                id="new-company-province"
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="new-company-representative"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Representante
              </label>
              <input
                id="new-company-representative"
                type="text"
                value={formData.representative}
                onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        {einformaExtra ? (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Datos ampliados (eInforma)</h3>
            <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-700">
              {einformaExtra.tradeName ? (
                <div>
                  <span className="text-slate-500">Nombre comercial</span>
                  <div className="font-medium">{einformaExtra.tradeName}</div>
                </div>
              ) : null}
              {einformaExtra.legalForm ? (
                <div>
                  <span className="text-slate-500">Forma jurídica</span>
                  <div className="font-medium">{einformaExtra.legalForm}</div>
                </div>
              ) : null}
              {einformaExtra.status ? (
                <div>
                  <span className="text-slate-500">Situación</span>
                  <div className="font-medium">{einformaExtra.status}</div>
                </div>
              ) : null}
              {einformaExtra.website ? (
                <div>
                  <span className="text-slate-500">Web</span>
                  <div className="font-medium">{einformaExtra.website}</div>
                </div>
              ) : null}
              {Number.isFinite(einformaExtra.employees) ? (
                <div>
                  <span className="text-slate-500">Empleados</span>
                  <div className="font-medium">{einformaExtra.employees}</div>
                </div>
              ) : null}
              {Number.isFinite(einformaExtra.sales) ? (
                <div>
                  <span className="text-slate-500">Ventas</span>
                  <div className="font-medium">{einformaExtra.sales}</div>
                </div>
              ) : null}
              {Number.isFinite(einformaExtra.salesYear) ? (
                <div>
                  <span className="text-slate-500">Año ventas</span>
                  <div className="font-medium">{einformaExtra.salesYear}</div>
                </div>
              ) : null}
              {Number.isFinite(einformaExtra.capitalSocial) ? (
                <div>
                  <span className="text-slate-500">Capital social</span>
                  <div className="font-medium">{einformaExtra.capitalSocial}</div>
                </div>
              ) : null}
              {einformaExtra.lastBalanceDate ? (
                <div>
                  <span className="text-slate-500">Último balance</span>
                  <div className="font-medium">{einformaExtra.lastBalanceDate}</div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        \n {/* Acciones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/dashboard/admin/companies"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Empresa'}
          </button>
        </div>
      </form>
    </main>
  );
}
