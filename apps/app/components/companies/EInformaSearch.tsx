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
}

export function EInformaSearch({
  onSelect,
  placeholder = 'Buscar por nombre o CIF...',
}: EInformaSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EInformaCompany[]>([]);
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
        setShowResults(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/onboarding/einforma/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.ok) {
          setResults(data.results || []);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Error searching:', error);
        setResults([]);
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

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
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
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <span className="font-semibold">CIF:</span> {company.nif}
                      </span>
                      {(company.city || company.province) && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {[company.city, company.province].filter(Boolean).join(", ")}
                        </span>
                      )}
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

      {/* No Results */}
      {showResults && query.length >= 3 && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg p-4">
          <div className="text-center text-sm text-slate-600">
            <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="font-medium">No se encontraron empresas</p>
            <p className="text-xs mt-1">Intenta con otro nombre o CIF</p>
          </div>
        </div>
      )}
    </div>
  );
}
