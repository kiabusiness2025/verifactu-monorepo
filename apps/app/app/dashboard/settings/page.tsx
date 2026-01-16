'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import IsaakToneSettings from '@/components/settings/IsaakToneSettings';
import { Camera, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const sessionData = useSession();
  const session = sessionData?.data;
  const { user: firebaseUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileSettings, setProfileSettings] = useState({
    displayName: '',
    email: '',
    phone: '',
    photoURL: '',
  });

  // Cargar datos del perfil desde API
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/user/profile');
        const data = await res.json();
        if (data.ok && data.user) {
          setProfileSettings({
            displayName: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            photoURL: data.user.photoURL || firebaseUser?.photoURL || '',
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        // Fallback a datos de Firebase
        if (firebaseUser) {
          setProfileSettings({
            displayName: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
            phone: '',
            photoURL: firebaseUser.photoURL || '',
          });
        }
      }
    }
    if (firebaseUser) {
      loadProfile();
    }
  }, [firebaseUser]);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileSettings.displayName,
          phone: profileSettings.phone,
          photoURL: profileSettings.photoURL,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar');
      }

      alert('Perfil actualizado correctamente');
      
      // Actualizar Firebase displayName si cambió
      if (firebaseUser && profileSettings.displayName !== firebaseUser.displayName) {
        const { updateProfile } = await import('firebase/auth');
        await updateProfile(firebaseUser, {
          displayName: profileSettings.displayName,
          photoURL: profileSettings.photoURL || firebaseUser.photoURL,
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error al guardar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      // Convertir a base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // Subir a Firebase Storage vía API
        const res = await fetch('/api/user/upload-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoURL: base64 }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Usar la URL pública de Firebase Storage
        setProfileSettings({ ...profileSettings, photoURL: data.photoURL });
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la foto');
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Configuración</h1>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        {/* Tabs */}
        <div className="border-b border-slate-200 flex overflow-x-auto">
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
            Facturación
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

        {/* Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Foto de Perfil */}
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200">
                    {profileSettings.photoURL ? (
                      <img
                        src={profileSettings.photoURL}
                        alt={profileSettings.displayName || 'Perfil'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-slate-400">
                        {profileSettings.displayName?.[0]?.toUpperCase() || 
                         profileSettings.email?.[0]?.toUpperCase() || 
                         'U'}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 disabled:bg-slate-400 flex items-center justify-center"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Foto de Perfil</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Sube una imagen de perfil. Formatos: JPG, PNG, GIF (máx. 5MB)
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-slate-400"
                  >
                    {uploadingPhoto ? 'Subiendo...' : 'Cambiar foto'}
                  </button>
                </div>
              </div>

              <hr className="border-slate-200" />

              <div className="space-y-4">
          {/* Profile Tab */}
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
                  <p className="mt-1 text-xs text-slate-500">Este nombre aparecerá en tu perfil y saludos de Isaak</p>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cambiar Contraseña</label>
                  <button
                    type="button"
                    onClick={() => alert('Próximamente: cambiar contraseña')}
                    className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium"
                  >
                    Actualizar contraseña
                  </button>
                  <p className="mt-1 text-xs text-slate-500">Se te enviará un email para restablecer tu contraseña</p>
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

          {/* General Tab (now renamed to Empresa) */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-6">
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código Postal</label>
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
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Plan Actual</h3>
                <p className="text-blue-800 text-sm">Plan Profesional - €99/mes</p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Método de Pago</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-slate-600 text-sm">Tarjeta Mastercard terminada en 4242</p>
                  <button className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Cambiar método de pago
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
                      <p className="font-medium text-slate-900">€99.00</p>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">Descargar PDF</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-900">Correo Electrónico (Resend)</h3>
                    <p className="text-sm text-slate-600 mt-1">Envía tus plantillas de email a través de Resend</p>
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

          {/* Team Tab */}
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

          {/* Isaak Tab */}
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
