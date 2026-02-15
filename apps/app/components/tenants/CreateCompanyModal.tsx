"use client";

import React, { useState, type FormEvent, useEffect } from "react";

type CreateCompanyModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CreateCompanyModal({ isOpen, onClose }: CreateCompanyModalProps) {
  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [billingUrl, setBillingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setNif("");
      setError("");
      setSuccess("");
      setBillingUrl(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

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
        if (data?.action === "TRIAL_LIMIT_REACHED") {
          setBillingUrl(typeof data?.billingUrl === "string" ? data.billingUrl : "/dashboard/settings?tab=billing");
        }
        throw new Error(
          data?.error || "No se pudo guardar la empresa"
        );
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

      setSuccess("Empresa guardada. Te hemos cambiado a la nueva empresa.");
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 600);
    } catch (err) {
      console.error("Create company error:", err);
      setError(err instanceof Error ? err.message : "No se pudo guardar la empresa. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-slate-900">Crear empresa</h2>
        <p className="mt-1 text-sm text-slate-600">
          Crea una nueva empresa para trabajar con datos reales.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
              {billingUrl ? (
                <div className="mt-2">
                  <a href={billingUrl} className="font-semibold underline">
                    Ver planes
                  </a>
                </div>
              ) : null}
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
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
