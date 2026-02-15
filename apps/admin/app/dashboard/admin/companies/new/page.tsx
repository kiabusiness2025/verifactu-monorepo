'use client';

import { EInformaSearch } from '@/components/companies/EInformaSearch';
import { useToast } from '@/components/notifications/ToastNotifications';
import { ArrowLeft, Plus, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type CollaboratorDraft = {
  email: string;
  role: 'owner' | 'admin' | 'member' | 'asesor';
};

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
    legal_form: '',
    status: '',
    website: '',
    capital_social: '',
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
  const [einformaMeta, setEinformaMeta] = useState<{
    cached?: boolean;
    cacheSource?: string;
    lastSyncAt?: string | null;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'mercantile' | 'contact'>('mercantile');
  const [collaborators, setCollaborators] = useState<CollaboratorDraft[]>([]);

  const formatDateInput = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 10);
  };

  const hasEinformaExtra =
    !!einformaExtra &&
    (Boolean(einformaExtra.tradeName) ||
      Boolean(einformaExtra.legalForm) ||
      Boolean(einformaExtra.status) ||
      Boolean(einformaExtra.website) ||
      Number.isFinite(einformaExtra.employees) ||
      Number.isFinite(einformaExtra.sales) ||
      Number.isFinite(einformaExtra.salesYear) ||
      Number.isFinite(einformaExtra.capitalSocial) ||
      Boolean(einformaExtra.lastBalanceDate));
  const mercantileDataLocked = formData.source === 'einforma';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          collaborators: collaborators
            .map((c) => ({ email: c.email.trim().toLowerCase(), role: c.role }))
            .filter((c) => c.email.length > 0),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const invited = Number(data?.invitedCount ?? 0);
        success(
          'Empresa creada',
          invited > 0
            ? `Empresa creada e invitaciones enviadas: ${invited}`
            : 'La empresa se cre\u00f3 correctamente'
        );
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
                  async function fetchProfile(refresh: boolean) {
                    const nifOrId = company.nif || company.id || '';
                    if (!nifOrId) {
                      setFormData((prev) => ({ ...prev, name: company.name }));
                      success('Empresa encontrada', `Datos de ${company.name} autocompletados`);
                      return;
                    }

                    const res = await fetch(
                      `/api/admin/einforma/profile?nif=${encodeURIComponent(nifOrId)}${
                        refresh ? '&refresh=1' : ''
                      }`
                    );
                    const data = await res.json();
                    const profile = data?.profile;
                    const normalized = data?.normalized;

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
                      city: normalized?.city || profile.address?.city || '',
                      postal_code: normalized?.postalCode || profile.address?.zip || '',
                      country: profile.address?.country || 'ES',
                      cnae: profile.cnae || '',
                      incorporation_date: formatDateInput(profile.constitutionDate),
                      legal_form: profile.legalForm || '',
                      status: profile.status || '',
                      website: profile.website || '',
                      capital_social: Number.isFinite(profile.capitalSocial)
                        ? String(profile.capitalSocial)
                        : '',
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
                    setEinformaMeta({
                      cached: data?.cached,
                      cacheSource: data?.cacheSource,
                      lastSyncAt: data?.lastSyncAt ?? null,
                    });
                    success(
                      'Empresa encontrada',
                      `Datos de ${profile.name || company.name} autocompletados`
                    );
                  }

                  try {
                    await fetchProfile(false);
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
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-blue-700">
                {einformaMeta?.cacheSource === 'tenantProfile' && einformaMeta.cached ? (
                  <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700">
                    Snapshot (≤30 días)
                  </span>
                ) : einformaMeta ? (
                  <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700">
                    eInforma (live)
                  </span>
                ) : null}
                {einformaMeta?.lastSyncAt ? (
                  <span className="text-blue-700/80">
                    Actualizado:{' '}
                    {new Intl.DateTimeFormat('es-ES', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(einformaMeta.lastSyncAt))}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={async () => {
                    const nifOrId = formData.tax_id?.trim();
                    if (!nifOrId || isRefreshing) return;
                    setIsRefreshing(true);
                    try {
                      const res = await fetch(
                        `/api/admin/einforma/profile?nif=${encodeURIComponent(nifOrId)}&refresh=1`
                      );
                      const data = await res.json();
                      if (!res.ok || !data?.profile) {
                        showError('No se pudo actualizar', 'Vuelve a intentarlo');
                        return;
                      }
                      const profile = data.profile;
                      const normalized = data.normalized;
                      setFormData((prev) => ({
                        ...prev,
                        name: profile.name || prev.name,
                        legal_name: profile.legalName || prev.legal_name,
                        tax_id: profile.nif || prev.tax_id,
                        email: profile.email || prev.email,
                        phone: profile.phone || prev.phone,
                        address: profile.address?.street || prev.address,
                        city: normalized?.city || profile.address?.city || prev.city,
                        postal_code:
                          normalized?.postalCode || profile.address?.zip || prev.postal_code,
                        country: profile.address?.country || prev.country,
                        cnae: profile.cnae || prev.cnae,
                        incorporation_date:
                          formatDateInput(profile.constitutionDate) || prev.incorporation_date,
                        legal_form: profile.legalForm || prev.legal_form,
                        status: profile.status || prev.status,
                        website: profile.website || prev.website,
                        capital_social: Number.isFinite(profile.capitalSocial)
                          ? String(profile.capitalSocial)
                          : prev.capital_social,
                        province: profile.address?.province || prev.province,
                        representative: profile.representatives?.[0]?.name || prev.representative,
                        source: 'einforma',
                        source_id: profile.sourceId || prev.source_id,
                      }));
                      setEinformaExtra((prev) => ({
                        ...prev,
                        tradeName: profile.tradeName ?? prev?.tradeName,
                        legalForm: profile.legalForm ?? prev?.legalForm,
                        status: profile.status ?? prev?.status,
                        employees: profile.employees ?? prev?.employees,
                        sales: profile.sales ?? prev?.sales,
                        salesYear: profile.salesYear ?? prev?.salesYear,
                        capitalSocial: profile.capitalSocial ?? prev?.capitalSocial,
                        lastBalanceDate: profile.lastBalanceDate ?? prev?.lastBalanceDate,
                        website: profile.website ?? prev?.website,
                      }));
                      setEinformaMeta({
                        cached: data?.cached,
                        cacheSource: data?.cacheSource,
                        lastSyncAt: data?.lastSyncAt ?? null,
                      });
                      success('Ficha actualizada', 'Datos actualizados desde eInforma');
                    } catch (error) {
                      console.error(error);
                      showError('No se pudo actualizar', 'Vuelve a intentarlo');
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  disabled={!formData.tax_id || isRefreshing}
                  className="rounded-full border border-blue-200 px-3 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100/60 disabled:opacity-50"
                  title="No se ha llamado a eInforma si hay snapshot"
                >
                  {isRefreshing ? 'Actualizando…' : 'Actualizar'}
                </button>
                {einformaMeta?.cacheSource === 'tenantProfile' && einformaMeta.cached ? (
                  <span className="text-blue-700/70">
                    No se ha llamado a eInforma (ahorro de créditos)
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('mercantile')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              activeTab === 'mercantile'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Datos mercantiles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              activeTab === 'contact'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Contacto y usuarios
          </button>
        </div>
        {mercantileDataLocked ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">Datos mercantiles bloqueados</p>
              <p className="mt-1">
                Estos datos se han extraído de información pública vigente en el Registro
                Mercantil y no se pueden modificar manualmente desde este formulario.
              </p>
              <p className="mt-1">
                Si no coinciden con tu documentación, abre incidencia en Soporte (ticket) y
                adjunta evidencias de la información correcta.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-semibold">Registro Mercantil vs Agencia Tributaria</p>
              <p className="mt-1">
                Los datos mercantiles no tienen por qué coincidir con los datos fiscales/de
                actividad de la AEAT. En la siguiente iteración se habilitará la pestaña de datos
                fiscales y de facturación para IAE, domicilio fiscal y obligaciones tributarias.
              </p>
              <p className="mt-1">
                ISAaK dispondrá de guía para obtención/actualización de datos AEAT y para carga de
                certificado IAE.
              </p>
            </div>
          </div>
        ) : null}

        {activeTab === 'mercantile' ? (
        <fieldset
          disabled={mercantileDataLocked}
          className={mercantileDataLocked ? 'space-y-6 opacity-80' : 'space-y-6'}
        >
        {/* Datos fiscales */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Datos fiscales</h2>

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
          </div>
        </div>
        {/* Actividad (CNAE) */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Actividad (CNAE)</h2>
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
          </div>
        </div>
        {/* Legal */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Legal</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-company-legal-form"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Forma jurídica
              </label>
              <input
                id="new-company-legal-form"
                type="text"
                value={formData.legal_form}
                onChange={(e) => setFormData({ ...formData, legal_form: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="new-company-status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Situación
              </label>
              <input
                id="new-company-status"
                type="text"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="new-company-capital-social"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Capital social
              </label>
              <input
                id="new-company-capital-social"
                type="text"
                value={formData.capital_social}
                onChange={(e) => setFormData({ ...formData, capital_social: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="new-company-website"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Web
              </label>
              <input
                id="new-company-website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
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
        </fieldset>
        ) : null}
        {activeTab === 'contact' ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-900">Datos de contacto</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="new-company-email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email de contacto
                  </label>
                  <input
                    id="new-company-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-company-phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Teléfono de contacto
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

            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Usuarios colaboradores</h2>
                  <p className="text-xs text-slate-600">
                    Se enviará invitación por correo para aceptar la colaboración.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCollaborators((prev) => [...prev, { email: '', role: 'member' }])
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Añadir usuario
                </button>
              </div>

              {collaborators.length === 0 ? (
                <p className="text-xs text-slate-600">No hay colaboradores añadidos.</p>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((item, idx) => (
                    <div key={`col-${idx}`} className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                      <input
                        type="email"
                        value={item.email}
                        onChange={(e) =>
                          setCollaborators((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, email: e.target.value } : row
                            )
                          )
                        }
                        placeholder="usuario@empresa.com"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <select
                        value={item.role}
                        onChange={(e) =>
                          setCollaborators((prev) =>
                            prev.map((row, i) =>
                              i === idx
                                ? {
                                    ...row,
                                    role: e.target.value as CollaboratorDraft['role'],
                                  }
                                : row
                            )
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="asesor">Asesor</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setCollaborators((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-red-600 hover:bg-red-50"
                        title="Eliminar colaborador"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
        {hasEinformaExtra ? (
          activeTab === 'mercantile' ? (
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
          ) : null
        ) : null}
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
