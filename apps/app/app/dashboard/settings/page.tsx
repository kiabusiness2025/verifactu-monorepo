'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Camera } from 'lucide-react';
import IsaakToneSettings from '@/components/settings/IsaakToneSettings';

const ALLOWED_TABS = new Set(['profile', 'general', 'billing', 'integrations', 'team', 'isaak']);

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const sessionData = useSession();
  const session = sessionData?.data;
  const [activeTenantId, setActiveTenantId] = useState<string>("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') || '';
  const initialTab = ALLOWED_TABS.has(tabParam) ? tabParam : 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [logoURL, setLogoURL] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [newTenantName, setNewTenantName] = useState("");
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [createTenantError, setCreateTenantError] = useState<string | null>(null);
  const [createTenantSuccess, setCreateTenantSuccess] = useState<string | null>(null);

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
    taxId: '',
  });

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('Saving general settings:', generalSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const name = newTenantName.trim();
    setCreateTenantError(null);
    setCreateTenantSuccess(null);

    if (!name) {
      setCreateTenantError("Introduce un nombre para la empresa.");
      return;
    }

    setIsCreatingTenant(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo crear la empresa");
      }

      const tenantId = data?.tenant?.id as string | undefined;
      if (tenantId) {
        await fetch("/api/session/tenant-switch", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId }),
        });
        setActiveTenantId(tenantId);
      }

      setNewTenantName("");
      setCreateTenantSuccess("Empresa creada. Te hemos cambiado a tu nueva empresa.");
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      console.error("Error creating tenant:", error);
      setCreateTenantError("No se pudo crear la empresa. Intenta de nuevo.");
    } finally {
      setIsCreatingTenant(false);
    }
  };

  // Cargar el tenant activo
  useEffect(() => {
    async function loadActiveTenant() {
      try {
        const res = await fetch("/api/tenants", { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (data?.ok && Array.isArray(data.tenants) && data.tenants.length > 0) {
          const preferredId = typeof data.preferredTenantId === "string"
            ? data.preferredTenantId
            : data.tenants[0]?.id || "";
          setActiveTenantId(preferredId);
        }
      } catch (error) {
        console.error("Error loading tenant:", error);
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
    async function loadLogo() {
      if (!activeTenantId) return;
      try {
        const res = await fetch(`/api/tenant/logo?tenantId=${activeTenantId}`, {
          credentials: "include"
        });
        const data = await res.json();
        if (data.ok && data.logoURL) {
          setLogoURL(data.logoURL);
        }
      } catch (error) {
        console.error("Error loading logo:", error);
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
      alert('Por favor selecciona una imagen valida');
      return;
    }

    // Validar tamano (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5MB');
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
            logoURL: base64
          })
        });

        const data = await res.json();
        if (data.ok && data.logoURL) {
          setLogoURL(data.logoURL);
          alert('Logo actualizado correctamente');
          // Recargar pagina para que se actualice en el Topbar
          window.location.reload();
        } else {
          alert(data.error || 'Error al subir el logo');
        }
      };

      reader.onerror = () => {
        alert('Error al leer el archivo');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error al subir el logo');
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
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Configuracion</h1>

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
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    value={profileSettings.displayName}
                    onChange={(e) =>
                      setProfileSettings({ ...profileSettings, displayName: e.target.value })
                    }
                    placeholder="Ej: Ksenia Ivanova"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">Este nombre aparecera en tu perfil y saludos de Isaak</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={profileSettings.email}
                    disabled
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-slate-500">El email no se puede cambiar una vez registrado</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
                  <input
                    type="tel"
                    value={profileSettings.phone}
                    onChange={(e) =>
                      setProfileSettings({ ...profileSettings, phone: e.target.value })
                    }
                    placeholder="+34 600 000 000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <hr className="border-slate-200" />

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Seguridad</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cambiar Contrasena</label>
                  <button
                    type="button"
                    onClick={() => alert('Proximamente: cambiar contrasena')}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium"
                  >
                    Actualizar contrasena
                  </button>
                  <p className="mt-1 text-xs text-slate-500">Se te enviara un email para restablecer tu contrasena</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 font-medium"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
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
                  Si estas en Empresa Demo SL, crea tu empresa aqui y empieza con tus datos reales.
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                    placeholder="Nombre de la empresa"
                    className="w-full flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingTenant}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isCreatingTenant ? 'Creando...' : 'Crear empresa'}
                  </button>
                </div>
                {createTenantError && (
                  <p className="mt-2 text-xs text-red-600">{createTenantError}</p>
                )}
                {createTenantSuccess && (
                  <p className="mt-2 text-xs text-emerald-600">{createTenantSuccess}</p>
                )}
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
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-lg disabled:bg-slate-400"
                        title="Cambiar logo"
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
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Empresa *</label>
                    <input
                      type="text"
                      value={generalSettings.companyName}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, companyName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={generalSettings.email}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
                    <input
                      type="tel"
                      value={generalSettings.phone}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">NIF/CIF</label>
                    <input
                      type="text"
                      value={generalSettings.taxId}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, taxId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Direccion</label>
                    <input
                      type="text"
                      value={generalSettings.address}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, address: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                    <input
                      type="text"
                      value={generalSettings.city}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, city: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Codigo Postal</label>
                    <input
                      type="text"
                      value={generalSettings.postalCode}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, postalCode: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 font-medium"
                  >
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
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
                      <button className="text-blue-600 hover:text-blue-800 text-sm">Descargar PDF</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-900">Correo Electronico (Resend)</h3>
                    <p className="text-sm text-slate-600 mt-1">Envia tus plantillas de email a traves de Resend</p>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Conectado
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-900">Google Sheets</h3>
                    <p className="text-sm text-slate-600 mt-1">Sincroniza tus datos con Google Sheets</p>
                  </div>
                  <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium">
                    Conectar
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-900">Zapier</h3>
                    <p className="text-sm text-slate-600 mt-1">Automatiza tu flujo de trabajo con Zapier</p>
                  </div>
                  <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium">
                    Conectar
                  </button>
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
        </div>
      </div>
    </div>
  );
}
