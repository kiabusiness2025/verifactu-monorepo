'use client';

import { Search, Building2, MapPin } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface EInformaCompany {
  id?: string;
  name: string;
  nif?: string;
  province?: string;
  city?: string;
}

interface EInformaSearchProps {
  onSelect: (company: EInformaCompany) => void;
  placeholder?: string;
}

function normalizeText(value?: string) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function companyScore(company: EInformaCompany, query: string) {
  const q = normalizeText(query);
  const name = normalizeText(company.name);
  const nif = normalizeText(company.nif);
  if (!q) return 999;
  if (nif && nif === q) return 0;
  if (name === q) return 1;
  if (name.startsWith(q)) return 2;
  if (name.includes(` ${q}`)) return 3;
  if (name.includes(q)) return 4;
  if (nif && nif.startsWith(q)) return 5;
  return 999;
}

export function EInformaSearch({
  onSelect,
  placeholder = 'Buscar por CIF o nombre (también 1 palabra)...',
}: EInformaSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EInformaCompany[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
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

  useEffect(() => {
    const searchCompanies = async () => {
      if (query.trim().length < 3) {
        setResults([]);
        setSearchError(null);
        setShowResults(false);
        return;
      }

      setLoading(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/admin/einforma/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!res.ok) {
          setResults([]);
          setSearchError(data?.error ?? 'No se pudo consultar eInforma');
          setShowResults(true);
          return;
        }
        const items = Array.isArray(data?.items) ? data.items : [];
        const sorted = [...items]
          .map((item, index) => ({ item, index }))
          .sort((a, b) => {
            const byScore = companyScore(a.item, query) - companyScore(b.item, query);
            if (byScore !== 0) return byScore;
            return a.index - b.index;
          })
          .map(({ item }) => item);
        setResults(sorted);
        setSelectedIndex(-1);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching:', error);
        setResults([]);
        setSearchError('No se pudo consultar eInforma');
        setShowResults(true);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchCompanies, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const handleSelect = (company: EInformaCompany) => {
    onSelect(company);
    setQuery('');
    setResults([]);
    setSearchError(null);
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
      <p className="mt-1 text-[11px] text-slate-500">
        Puedes buscar con 1 palabra. Si hay muchos resultados, afina con 2+ palabras o CIF exacto.
      </p>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="p-2 space-y-1">
            {results.map((company, index) => (
              <button
                key={company.id || company.nif || `${company.name}-${index}`}
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
                      {(company.city || company.province) && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {[company.city, company.province].filter(Boolean).join(", ")}
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

      {/* Search Error */}
      {showResults && query.length >= 3 && !loading && !!searchError && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-red-200 bg-white shadow-lg p-4">
          <div className="text-center text-sm text-red-700">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-red-300" />
            <p className="font-medium">No se pudo buscar en eInforma</p>
            <p className="text-xs mt-1">{searchError}</p>
          </div>
        </div>
      )}

      {/* No Results */}
      {showResults && query.length >= 3 && !loading && !searchError && results.length === 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg p-4">
          <div className="text-center text-sm text-slate-600">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="font-medium">No se encontraron empresas</p>
            <p className="text-xs mt-1">
              Prueba otra combinación: 1 palabra, 2+ palabras o CIF exacto.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
