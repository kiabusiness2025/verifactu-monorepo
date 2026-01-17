"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const companyName = name.trim();
    if (!companyName) {
      setError("Introduce el nombre de la empresa.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName, nif: nif.trim() || null }),
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

      if (user) {
        const token = await user.getIdToken();
        await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ has_completed_onboarding: true }),
        }).catch(() => {});
      }

      setStep(2);
    } catch (err) {
      console.error("Onboarding create error:", err);
      setError("No se pudo crear la empresa. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Paso {step} de 2
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Configura tu empresa</h1>
              <p className="mt-2 text-sm text-slate-600">
                Empezamos con lo minimo para que puedas entrar al dashboard.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
              Onboarding
            </span>
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la empresa *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Empresa Demo SL"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">NIF (opcional)</label>
                <input
                  type="text"
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  placeholder="B12345678"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-400"
                >
                  Buscar en eInforma (pronto)
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-slate-500">Puedes completar el resto en Configuracion.</p>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? "Creando..." : "Crear empresa"}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Listo. Ya puedes entrar al dashboard.</h2>
            <p className="mt-2 text-sm text-slate-600">
              Hemos creado la empresa y activado el panel para que empieces con tus datos reales.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Ir al dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
