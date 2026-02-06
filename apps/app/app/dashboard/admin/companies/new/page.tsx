'use client';

import { EInformaSearch } from '@/components/companies/EInformaSearch';
import { useToast } from '@/components/notifications/ToastNotifications';
import { EinformaAutofillButton } from '@/src/components/einforma/EinformaAutofillButton';
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
  });

  function applyNormalized(normalized: {
    name?: string | null;
    legalName?: string | null;
    nif?: string | null;
    address?: string | null;
    postalCode?: string | null;
    city?: string | null;
    province?: string | null;
    country?: string | null;
    website?: string | null;
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
  }

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
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
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
                    const res = await fetch(
                      `/api/onboarding/einforma/company?einformaId=${encodeURIComponent(
                        company.einformaId
                      )}`
                    );
                    const data = await res.json();

                    if (res.ok && data?.company) {
                      setFormData((prev) => ({
                        ...prev,
                        name: data.company.name ?? company.name,
                        legal_name: data.company.legalName ?? company.name,
                        tax_id: data.company.nif ?? company.nif ?? '',
                        address: data.company.address ?? '',
                        city: data.company.city ?? '',
                        country: 'ES',
                      }));
                      success(
                        'Empresa encontrada',
                        `Datos de ${data.company.name ?? company.name} autocompletados`
                      );
                      return;
                    }
                  } catch (err) {
                    console.error('Error fetching company details:', err);
                  }

                  setFormData((prev) => ({
                    ...prev,
                    name: company.name,
                    legal_name: company.name,
                    tax_id: company.nif ?? '',
                    city: company.city ?? '',
                    country: 'ES',
                  }));
                  success('Empresa encontrada', `Datos de ${company.name} autocompletados`);
                }}
              />
            </div>
          </div>
        </div>

        {/* Informacion Basica */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Informacion Basica</h2>

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
                Razon Social
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
            <div className="sm:col-span-2">
              <EinformaAutofillButton
                taxIdValue={formData.tax_id}
                onApply={applyNormalized}
                endpoint="/api/admin/einforma/profile"
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
                Telefono
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
                Pais
              </label>
              <select
                id="new-company-country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ES">Espana</option>
                <option value="PT">Portugal</option>
                <option value="FR">Francia</option>
                <option value="IT">Italia</option>
              </select>
            </div>
          </div>
        </div>

        {/* Direccion */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Direccion</h2>

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
                Codigo Postal
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

        {/* Acciones */}
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

