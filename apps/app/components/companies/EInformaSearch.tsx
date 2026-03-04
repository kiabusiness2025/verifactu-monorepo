'use client';

import { Search, Building2, MapPin } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export interface EInformaCompany {
  einformaId: string;
  name: string;
  nif: string;
  province?: string;
  city?: string;
}

interface EInformaSearchProps {
  onSelect: (company: EInformaCompany) => void;
  placeholder?: string;
  onManualEntryRequested?: () => void;
}

export function EInformaSearch({
  onSelect,
  placeholder = 'Buscar por nombre o CIF...',
  onManualEntryRequested,
}: EInformaSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EInformaCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [errorMessage, setErrorMessage] = useState('');
  const [metaMessage, setMetaMessage] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function executeSearch() {
    if (query.trim().length < 3 || loading) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/onboarding/einforma/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        const nextResults = Array.isArray(data.results) ? data.results : [];
        setResults(nextResults);
        setShowResults(true);
        setErrorMessage('');
        const source = typeof data.cacheSource === 'string' ? data.cacheSource : '';
        if (source.startsWith('tenantProfile')) {
          setMetaMessage('Resultados desde datos locales');
        } else if (source.startsWith('einformaLookup')) {
          setMetaMessage('Resultados desde caché');
        } else if (source === 'einforma') {
          setMetaMessage('Resultados actualizados');
        } else if (source === 'unavailable') {
          setMetaMessage('Ahora no hay resultados automáticos. Puedes continuar manualmente.');
        } else {
          setMetaMessage('');
        }
        if (nextResults.length === 0 && onManualEntryRequested) {
          onManualEntryRequested();
        }
      } else {
        setResults([]);
        setShowResults(true);
        setMetaMessage('');
        if (res.status === 401) {
          setErrorMessage('Tu sesión ha caducado. Recarga la página e inténtalo de nuevo.');
        } else if (res.status === 429) {
          setErrorMessage('Demasiadas búsquedas seguidas. Espera unos segundos.');
        } else {
          setErrorMessage('No se pudo completar la búsqueda ahora. Puedes continuar manualmente.');
        }
        if (onManualEntryRequested) onManualEntryRequested();
      }
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
      setShowResults(true);
      setErrorMessage('No se pudo completar la búsqueda ahora. Puedes continuar manualmente.');
      setMetaMessage('');
      if (onManualEntryRequested) onManualEntryRequested();
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showResults && results.length > 0 && selectedIndex >= 0) {
        handleSelect(results[selectedIndex]);
        return;
      }
      void executeSearch();
      return;
    }

    if (!showResults || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const handleSelect = (company: EInformaCompany) => {
    onSelect(company);
    setQuery('');
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
  };

  return (
    <div ref={searchRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-slate-400" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void executeSearch()}
          disabled={loading || query.trim().length < 3}
          className="inline-flex h-9 items-center rounded-lg bg-[#0b6cfb] px-3 text-xs font-semibold text-white hover:bg-[#095edb] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Buscando...' : 'Buscar empresa'}
        </button>
        <button
          type="button"
          onClick={onManualEntryRequested}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Introducir manualmente
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Se consulta solo al pulsar el botón (ahorro de créditos).
      </p>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {metaMessage ? (
            <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
              {metaMessage}
            </div>
          ) : null}
          <div className="p-2 space-y-1">
            {results.map((company, index) => (
              <button
                key={company.einformaId}
                type="button"
                onClick={() => handleSelect(company)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <h3 className="font-semibold text-slate-900 truncate">{company.name}</h3>
                    </div>
                    <div className="mt-2 space-y-1">
                      {company.nif ? (
                        <div className="text-xs text-slate-600">
                          <span className="text-slate-500">CIF/NIF:</span> {company.nif}
                        </div>
                      ) : null}
                      {(company.city || company.province) && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            <span className="text-slate-500">Dirección:</span>{' '}
                            {[company.city, company.province].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-200 p-2 bg-slate-50">
            <p className="text-xs text-slate-500 text-center">
              Usa Arriba/Abajo para navegar, Enter para seleccionar, Esc para cerrar
            </p>
          </div>
        </div>
      )}

      {/* No Results */}
      {showResults && query.length >= 3 && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg p-4">
          <div className="text-center text-sm text-slate-600">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="font-medium">
              {errorMessage ? 'No se pudo realizar la búsqueda' : 'No se encontraron empresas'}
            </p>
            <p className="text-xs mt-1">
              {errorMessage || metaMessage || 'Intenta con otro nombre o CIF'}
            </p>
            <button
              type="button"
              onClick={onManualEntryRequested}
              className="mt-3 inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Introducir datos manualmente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
