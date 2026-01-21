"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [nif, setNif] = useState("");

  const canSubmit = companyName.trim().length > 0 && nif.trim().length > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Anade tu empresa</h1>
        <p className="mt-2 text-sm text-slate-600">
          Completa estos datos para configurar tu dashboard. Luego continuas en tu panel real.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Nombre de la empresa
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Empresa Demo SL"
              autoComplete="organization"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            NIF
            <input
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="B12345678"
              autoComplete="off"
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:from-[#0056D6] hover:to-[#1AA3DB] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continuar
          </button>
        </form>
      </div>
    </main>
  );
}
