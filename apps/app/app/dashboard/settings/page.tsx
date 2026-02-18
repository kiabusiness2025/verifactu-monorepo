'use client';

import { AccessibleButton } from '@/components/accessibility/AccessibleButton';
import { AccessibleInput } from '@/components/accessibility/AccessibleFormInputs';
import { useToast } from '@/components/notifications/ToastNotifications';
import IsaakToneSettings from '@/components/settings/IsaakToneSettings';
import { EinformaAutofillButton } from '@/src/components/einforma/EinformaAutofillButton';
import { formatDateTime } from '@/src/lib/formatters';
import { Camera } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

const ALLOWED_TABS = new Set([
  'profile',
  'general',
  'billing',
  'integrations',
  'team',
  'isaak',
  'sessions',
]);

function SettingsContent() {
  const sessionData = useSession();
  const session = sessionData?.data;
  const { success, error: showError } = useToast();
  const [activeTenantId, setActiveTenantId] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') || '';
  const initialTab = ALLOWED_TABS.has(tabParam) ? tabParam : 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [logoURL, setLogoURL] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [createTenantError, setCreateTenantError] = useState<string | null>(null);
  const [createTenantSuccess, setCreateTenantSuccess] = useState<string | null>(null);
  const [createTenantBillingUrl, setCreateTenantBillingUrl] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{
    email: string | null;
    tenantId: string | null;
    issuedAt: string | null;
    expiresAt: string | null;
    rememberDevice: boolean | null;
  } | null>(null);
  const [sessionInfoLoading, setSessionInfoLoading] = useState(false);
  const [sessionInfoError, setSessionInfoError] = useState<string | null>(null);

  const [profileSettings, setProfileSettings] = useState({
    displayName: session?.user?.name || '',
    email: session?.user?.email || '',
    phone: '',
  });

  const [generalSettings, setGeneralSettings] = useState({
    companyName: session?.user?.email || '',
    email: session?.user?.email || '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    website: '',
    taxId: '',
  });
  const [einformaMeta, setEinformaMeta] = useState<{
    cached?: boolean;
    cacheSource?: string | null;
    lastSyncAt?: string | null;
  } | null>(null);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('Saving general settings:', generalSettings);
      success('Configuración guardada', 'Los cambios se han guardado correctamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Error al guardar', 'No se pudieron guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const name = newTenantName.trim();
    setCreateTenantError(null);
    setCreateTenantSuccess(null);
    setCreateTenantBillingUrl(null);

    if (!name) {
      setCreateTenantError('Introduce un nombre para la empresa.');
      return;
    }

    setIsCreatingTenant(true);
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        if (data?.action === 'TRIAL_LIMIT_REACHED') {
          setCreateTenantBillingUrl(
            typeof data?.billingUrl === 'string'
              ? data.billingUrl
              : '/dashboard/settings?tab=billing'
          );
        }
        throw new Error(data?.error || 'No se pudo crear la empresa');
      }

      const tenantId = data?.tenant?.id as string | undefined;
      if (tenantId) {
        await fetch('/api/session/tenant-switch', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId }),
        });
        setActiveTenantId(tenantId);
      }

      setNewTenantName('');
      setCreateTenantSuccess('Empresa creada. Te hemos cambiado a tu nueva empresa.');
      success('Empresa creada', 'Redirigiendo a tu nueva empresa...');
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      console.error('Error creating tenant:', error);
      const errorMsg = 'No se pudo crear la empresa. Intenta de nuevo.';
      setCreateTenantError(errorMsg);
      showError('Error al crear empresa', errorMsg);
    } finally {
      setIsCreatingTenant(false);
    }
  };

  // Cargar el tenant activo
  useEffect(() => {
    async function loadActiveTenant() {
      try {
        const res = await fetch('/api/tenants', { credentials: 'include' });
        const data = await res.json().catch(() => null);
        if (data?.ok && Array.isArray(data.tenants) && data.tenants.length > 0) {
          const preferredId =
            typeof data.preferredTenantId === 'string'
              ? data.preferredTenantId
              : data.tenants[0]?.id || '';
          setActiveTenantId(preferredId);
        }
      } catch (error) {
        console.error('Error loading tenant:', error);
      }
    }
    loadActiveTenant();
  }, []);

  useEffect(() => {
    if (ALLOWED_TABS.has(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [activeTab, tabParam]);

  useEffect(() => {
    if (activeTab !== 'sessions') return;
    let mounted = true;
    async function loadSessionInfo() {
      setSessionInfoLoading(true);
      setSessionInfoError(null);
      try {
        const res = await fetch('/api/session/info', { credentials: 'include' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'No se pudo cargar la sesión');
        }
        if (mounted) {
          setSessionInfo(data.session || null);
        }
      } catch {
        if (mounted) {
          setSessionInfo(null);
          setSessionInfoError('No se pudo cargar la sesión.');
        }
      } finally {
        if (mounted) setSessionInfoLoading(false);
      }
    }
    loadSessionInfo();
    return () => {
      mounted = false;
    };
  }, [activeTab]);

  useEffect(() => {
    async function loadLogo() {
      if (!activeTenantId) return;
      try {
        const res = await fetch(`/api/tenant/logo?tenantId=${activeTenantId}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.ok && data.logoURL) {
          setLogoURL(data.logoURL);
        }
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }
    loadLogo();
  }, [activeTenantId]);

  const handleLogoClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      showError('Archivo inv\u00e1lido', 'Por favor selecciona una imagen v\u00e1lida');
      return;
    }

    // Validar tamano (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Archivo muy grande', 'La imagen no puede superar los 5MB');
      return;
    }

    setIsUploadingLogo(true);
    try {
      // Convertir a base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;

        // Subir a la API
        const res = await fetch('/api/tenant/logo', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: activeTenantId,
            logoURL: base64,
          }),
        });

        const data = await res.json();
        if (data.ok && data.logoURL) {
          setLogoURL(data.logoURL);
          success('Logo actualizado', 'El logo se actualiz\u00f3 correctamente');
          // Recargar pagina para que se actualice en el Topbar
          window.location.reload();
        } else {
          showError('Error al subir logo', data.error || 'No se pudo actualizar el logo');
        }
      };

      reader.onerror = () => {
        showError('Error al leer archivo', 'No se pudo leer el archivo seleccionado');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading logo:', error);
      showError('Error al subir logo', 'No se pudo subir el logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('Saving profile settings:', profileSettings);
      // TODO: Implementar guardado de perfil
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Configuración</h1>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Empresa
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'billing'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Facturacion
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'integrations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Integraciones
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'team'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Equipo
          </button>
          <button
            onClick={() => setActiveTab('isaak')}
            className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'isaak'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Isaak
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sessions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Sesiones
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="space-y-4">
                <AccessibleInput
                  label="Nombre Completo"
                  type="text"
                  value={profileSettings.displayName}
                  onChange={(e) =>
                    setProfileSettings({ ...profileSettings, displayName: e.target.value })
                  }
                  placeholder="Ej: Ksenia Ivanova"
                  required
                  helperText="Este nombre aparecerá en tu perfil y saludos de Isaak"
                />

                <AccessibleInput
                  label="Email"
                  type="email"
                  value={profileSettings.email}
                  disabled
                  required
                  helperText="El email no se puede cambiar una vez registrado"
                />

                <AccessibleInput
                  label="Teléfono"
                  type="tel"
                  value={profileSettings.phone}
                  onChange={(e) =>
                    setProfileSettings({ ...profileSettings, phone: e.target.value })
                  }
                  placeholder="+34 600 000 000"
                />
              </div>

              <hr className="border-slate-200" />

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Seguridad</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cambiar contraseña
                  </label>
                  <AccessibleButton
                    variant="secondary"
                    onClick={() => success('Próximamente: funcionalidad de cambiar contraseña')}
                    ariaLabel="Actualizar contraseña"
                  >
                    Actualizar contraseña
                  </AccessibleButton>
                  <p className="mt-1 text-xs text-slate-500">
                    Se te enviará un email para restablecer tu contraseña
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <AccessibleButton
                  type="submit"
                  loading={loading}
                  disabled={loading}
                  ariaLabel="Guardar cambios de perfil"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </AccessibleButton>
              </div>
            </form>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <form
                onSubmit={handleCreateTenant}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="text-sm font-semibold text-slate-900">Crear empresa nueva</h3>
                <p className="mt-1 text-xs text-slate-600">
                  En modo prueba solo puedes usar una empresa con datos reales.
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <AccessibleInput
                      label="Nombre de la empresa"
                      showLabel={false}
                      type="text"
                      value={newTenantName}
                      onChange={(e) => setNewTenantName(e.target.value)}
                      placeholder="Nombre de la empresa"
                      error={createTenantError || undefined}
                    />
                  </div>
                  <AccessibleButton
                    type="submit"
                    loading={isCreatingTenant}
                    disabled={isCreatingTenant}
                    ariaLabel="Crear nueva empresa"
                  >
                    {isCreatingTenant ? 'Creando...' : 'Crear empresa'}
                  </AccessibleButton>
                </div>
                {createTenantSuccess && (
                  <p className="mt-2 text-xs text-emerald-600">{createTenantSuccess}</p>
                )}
                {createTenantError && createTenantBillingUrl ? (
                  <a
                    href={createTenantBillingUrl}
                    className="mt-2 inline-block text-xs font-semibold text-blue-700 underline"
                  >
                    Contratar plan para añadir más empresas
                  </a>
                ) : null}
              </form>

              <form onSubmit={handleSaveGeneral} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Logo de la Empresa</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {logoURL ? (
                        <div className="relative h-24 w-24 rounded-xl overflow-hidden border-2 border-slate-200">
                          <Image
                            src={logoURL}
                            alt="Logo de empresa"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl">
                          {generalSettings.companyName.charAt(0).toUpperCase() || 'E'}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleLogoClick}
                        disabled={isUploadingLogo}
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-lg disabled:bg-slate-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        title="Cambiar logo"
                        aria-label="Cambiar logo de la empresa"
                      >
                        <Camera size={16} />
                      </button>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-600">
                        Este logo aparecera en el panel de control de tu empresa
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Formato: JPG, PNG o WebP - Maximo 5MB - Recomendado: imagen cuadrada
                      </p>
                      {isUploadingLogo && (
                        <p className="text-sm text-blue-600 mt-2">Subiendo logo...</p>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200" />

                <div className="grid grid-cols-2 gap-4">
                  <AccessibleInput
                    label="Nombre de la Empresa"
                    type="text"
                    value={generalSettings.companyName}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, companyName: e.target.value })
                    }
                    required
                  />

                  <AccessibleInput
                    label="Email"
                    type="email"
                    value={generalSettings.email}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, email: e.target.value })
                    }
                    required
                  />

                  <AccessibleInput
                    label="Teléfono"
                    type="tel"
                    value={generalSettings.phone}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, phone: e.target.value })
                    }
                  />

                  <AccessibleInput
                    label="NIF/CIF"
                    type="text"
                    value={generalSettings.taxId}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, taxId: e.target.value })
                    }
                  />
                  <EinformaAutofillButton
                    taxIdValue={generalSettings.taxId}
                    onApply={(normalized, meta) => {
                      setGeneralSettings((prev) => ({
                        ...prev,
                        companyName:
                          prev.companyName ||
                          normalized.legalName ||
                          normalized.name ||
                          prev.companyName,
                        taxId: prev.taxId || normalized.nif || prev.taxId,
                        address: prev.address || normalized.address || prev.address,
                        city: prev.city || normalized.city || prev.city,
                        postalCode: prev.postalCode || normalized.postalCode || prev.postalCode,
                        country: prev.country || normalized.country || prev.country,
                        website: prev.website || normalized.website || prev.website,
                      }));
                      setEinformaMeta(meta);
                    }}
                  />
                  {einformaMeta?.lastSyncAt ? (
                    <div className="mt-2 text-xs text-slate-500">
                      {einformaMeta.cached ? 'Snapshot (<=30 días)' : 'eInforma (live)'} · Actualizado:{' '}
                      {einformaMeta.lastSyncAt}
                    </div>
                  ) : null}

                  <AccessibleInput
                    label="Dirección"
                    type="text"
                    value={generalSettings.address}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, address: e.target.value })
                    }
                  />

                  <AccessibleInput
                    label="Ciudad"
                    type="text"
                    value={generalSettings.city}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, city: e.target.value })
                    }
                  />

                  <AccessibleInput
                    label="Código Postal"
                    type="text"
                    value={generalSettings.postalCode}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, postalCode: e.target.value })
                    }
                  />

                  <AccessibleInput
                    label="País"
                    type="text"
                    value={generalSettings.country}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, country: e.target.value })
                    }
                  />

                  <AccessibleInput
                    label="Web"
                    type="text"
                    value={generalSettings.website}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, website: e.target.value })
                    }
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <AccessibleButton
                    type="submit"
                    loading={loading}
                    disabled={loading}
                    ariaLabel="Guardar cambios de configuración general"
                  >
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </AccessibleButton>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Plan Actual</h3>
                <p className="text-blue-800 text-sm">Plan Profesional - EUR 99/mes</p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Metodo de Pago</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-slate-600 text-sm">Tarjeta Mastercard terminada en 4242</p>
                  <button className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Cambiar metodo de pago
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Facturas Recientes</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-200">
                    <div>
                      <p className="font-medium text-slate-900">Factura INV-2026-01</p>
                      <p className="text-sm text-slate-600">14 Enero, 2026</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">EUR 99.00</p>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        Descargar PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-8">
              {/* Correo Electrónico */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Correo Electrónico</h3>
                <div className="space-y-3">
                  {/* Gmail */}
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center text-white font-bold">
                          G
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">Gmail</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Conecta tu cuenta de Gmail para enviar y recibir emails desde el panel
                          </p>
                        </div>
                      </div>
                      <a
                        href="/api/integrations/gmail/auth"
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                      >
                        Conectar
                      </a>
                    </div>
                  </div>

                  {/* Microsoft/Outlook */}
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                          M
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">Microsoft / Outlook</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Conecta tu cuenta de Microsoft para gestionar emails de Outlook
                          </p>
                        </div>
                      </div>
                      <a
                        href="/api/integrations/microsoft/auth"
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                      >
                        Conectar
                      </a>
                    </div>
                  </div>

                  {/* Resend (Sistema) */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          R
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">Resend (Sistema)</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Servicio de email transaccional para notificaciones automáticas
                          </p>
                        </div>
                      </div>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Activo
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Almacenamiento */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Almacenamiento en la Nube
                </h3>
                <div className="space-y-3">
                  {/* Google Drive */}
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 via-green-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          D
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">Google Drive</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Guarda y sincroniza documentos en Google Drive automáticamente
                          </p>
                        </div>
                      </div>
                      <a
                        href="/api/integrations/gdrive/auth"
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                      >
                        Conectar
                      </a>
                    </div>
                  </div>

                  {/* OneDrive */}
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold">
                          O
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">OneDrive</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Guarda documentos en OneDrive y accede desde cualquier lugar
                          </p>
                        </div>
                      </div>
                      <a
                        href="/api/integrations/onedrive/auth"
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                      >
                        Conectar
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calendario */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Calendario</h3>
                <div className="space-y-3">
                  {/* Google Calendar */}
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 flex items-center justify-center text-white font-bold">
                          📅
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">Google Calendar</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Sincroniza eventos y reuniones con tu calendario de Google
                          </p>
                        </div>
                      </div>
                      <a
                        href="/api/integrations/gcalendar/auth"
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                      >
                        Conectar
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Otras Integraciones */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Otras Integraciones</h3>
                <div className="space-y-3">
                  {/* eInforma */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          e
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">eInforma</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Búsqueda y autocompletado de datos de empresas españolas
                          </p>
                        </div>
                      </div>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Activo
                      </span>
                    </div>
                  </div>

                  {/* Google Sheets */}
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center text-white font-bold">
                          S
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">Google Sheets</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Exporta datos a hojas de cálculo de Google automáticamente
                          </p>
                        </div>
                      </div>
                      <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium">
                        Conectar
                      </button>
                    </div>
                  </div>

                  {/* Zapier */}
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                          Z
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">Zapier</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            Automatiza flujos de trabajo con más de 5,000 aplicaciones
                          </p>
                        </div>
                      </div>
                      <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium">
                        Conectar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-900">Miembros del Equipo</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                  + Invitar Miembro
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="font-medium text-slate-900">{session?.user?.email}</p>
                    <p className="text-sm text-slate-600">Propietario</p>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Activo
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'isaak' && (
            <div>
              <IsaakToneSettings />
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Sesión actual</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Detalles básicos de tu acceso en este dispositivo.
                </p>

                {sessionInfoLoading ? (
                  <p className="mt-3 text-sm text-slate-500">Cargando…</p>
                ) : sessionInfoError ? (
                  <p className="mt-3 text-sm text-amber-600">{sessionInfoError}</p>
                ) : !sessionInfo ? (
                  <p className="mt-3 text-sm text-slate-500">No hay una sesión activa.</p>
                ) : (
                  <div className="mt-4 space-y-2 text-sm text-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-500">Inicio de sesión</span>
                      <span>
                        {sessionInfo.issuedAt ? formatDateTime(sessionInfo.issuedAt) : '—'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-500">Caduca</span>
                      <span>
                        {sessionInfo.expiresAt ? formatDateTime(sessionInfo.expiresAt) : '—'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-500">Recordar este dispositivo</span>
                      <span>
                        {sessionInfo.rememberDevice === null
                          ? '—'
                          : sessionInfo.rememberDevice
                          ? 'Sí'
                          : 'No'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Cargando...</div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
