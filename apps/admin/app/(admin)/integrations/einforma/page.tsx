'use client';

import { useState } from 'react';

export default function EinformaTestPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedNif, setSelectedNif] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setError('Escribe al menos 3 caracteres');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch(`/api/admin/einforma/search?q=${encodeURIComponent(searchQuery)}`);

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();
      setResults(data.items || []);

      if (!data.items || data.items.length === 0) {
        setError('No se encontraron resultados');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la búsqueda');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetProfile = async (nif: string) => {
    if (!nif) return;

    setLoadingProfile(true);
    setProfileError('');
    setProfileData(null);
    setSelectedNif(nif);

    try {
      const res = await fetch(`/api/admin/einforma/profile?nif=${encodeURIComponent(nif)}`);

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();
      setProfileData(data?.profile ?? data);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Error al obtener el perfil');
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">Integraciones</div>
          <h1 className="text-2xl font-semibold text-slate-900">Test eINFORMA</h1>
          <p className="text-sm text-slate-500">Prueba la integración con eINFORMA</p>
        </div>
      </div>

      {/* Search Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Búsqueda de empresas</h2>
          <p className="text-xs text-slate-500">Busca por nombre, NIF, CIF o razón social</p>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="Ej: Google, A12345678, Expert Estudios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                {results.length} resultado{results.length !== 1 ? 's' : ''}
                encontrado{results.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-500">{item.nif || item.id}</p>
                        {item.province && <p className="text-sm text-slate-500">{item.province}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGetProfile(item.id || item.nif || '')}
                        disabled={loadingProfile}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Ver perfil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Section */}
      {profileData && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Perfil de empresa</h2>
            <p className="text-xs text-slate-500">Detalles de {selectedNif}</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-500">Nombre</p>
                <p className="text-sm text-slate-900">{profileData.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Razón social</p>
                <p className="text-sm text-slate-900">{profileData.legalName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">NIF</p>
                <p className="text-sm text-slate-900">{profileData.nif || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">CNAE</p>
                <p className="text-sm text-slate-900">{profileData.cnae || 'N/A'}</p>
              </div>
            </div>

            {profileData.address && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Domicilio</p>
                <div className="text-sm space-y-1 border-l border-slate-200 pl-4 text-slate-600">
                  <p>{profileData.address.street}</p>
                  <p>
                    {profileData.address.zip} {profileData.address.city}
                  </p>
                  <p>{profileData.address.province}</p>
                  <p>{profileData.address.country}</p>
                </div>
              </div>
            )}

            {profileData.constitutionDate && (
              <div>
                <p className="text-xs font-medium text-slate-500">Fecha de constitución</p>
                <p className="text-sm text-slate-900">{profileData.constitutionDate}</p>
              </div>
            )}

            {profileData.representatives?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Administradores</p>
                <ul className="text-sm space-y-1 list-disc pl-4 text-slate-600">
                  {profileData.representatives.map((rep: any, idx: number) => (
                    <li key={idx}>
                      {rep.name}
                      {rep.role && ` (${rep.role})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {profileError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">{profileError}</p>
        </div>
      )}
    </div>
  );
}
