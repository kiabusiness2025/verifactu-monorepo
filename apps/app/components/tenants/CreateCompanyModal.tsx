"use client";

import React, { useState, type FormEvent, useEffect } from "react";

type CreateCompanyModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type EinformaItem = {
  name: string;
  nif?: string;
  province?: string;
  id?: string;
};

export function CreateCompanyModal({ isOpen, onClose }: CreateCompanyModalProps) {
  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EinformaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setNif("");
      setError("");
      setSuccess("");
      setIsSubmitting(false);
      setSearchQuery("");
      setSearchResults([]);
      setIsSearching(false);
      setSearchError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const res = await fetch(`/api/einforma/search?q=${encodeURIComponent(query)}`, {
          credentials: "include",
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "No se pudo consultar eInforma");
        }
        setSearchResults(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setSearchError("No se pudo consultar eInforma. Revisa la configuracion.");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen, searchQuery]);

  const handlePickCompany = (item: EinformaItem) => {
    setName(item.name || "");
    setNif(item.nif || "");
    setSearchQuery(item.name || "");
    setSearchResults([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Introduce el nombre de la empresa.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, nif: nif.trim() || null }),
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
      }

      setSuccess("Empresa creada. Te hemos cambiado a la nueva empresa.");
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 600);
    } catch (err) {
      console.error("Create company error:", err);
      setError("No se pudo crear la empresa. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          Cerrar
        </button>

        <h2 className="text-xl font-semibold text-slate-900">Crear empresa</h2>
        <p className="mt-1 text-sm text-slate-600">
          Crea una nueva empresa para trabajar con datos reales.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Buscar empresa (eInforma)
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nombre o NIF"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="mt-2 text-xs text-slate-500">
              Escribe al menos 3 caracteres para sugerencias automáticas.
            </div>
            {isSearching && (
              <div className="mt-2 text-xs text-slate-500">Buscando en eInforma...</div>
            )}
            {searchError && (
              <div className="mt-2 text-xs text-red-600">{searchError}</div>
            )}
            {searchResults.length > 0 && (
              <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                {searchResults.map((item) => (
                  <button
                    key={`${item.nif || item.id || item.name}`}
                    type="button"
                    onClick={() => handlePickCompany(item)}
                    className="flex w-full flex-col gap-1 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">{item.name || "Empresa"}</span>
                    <span className="text-xs text-slate-500">
                      {(item.nif || "NIF no disponible") + (item.province ? ` · ${item.province}` : "")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mi Empresa SL"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">NIF</label>
            <input
              type="text"
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              placeholder="B12345678"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Creando..." : "Crear empresa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
