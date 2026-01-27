"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { EInformaSearch } from "@/components/companies/EInformaSearch";
import { useToast } from "@/components/notifications/ToastNotifications";

type SelectedCompany = {
  einformaId?: string;
  name: string;
  legalName?: string;
  nif?: string;
  cnae?: string;
  incorporationDate?: string;
  address?: string;
  city?: string;
  province?: string;
  representative?: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();

  const [selected, setSelected] = useState<SelectedCompany | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [nif, setNif] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const nextUrl = useMemo(() => {
    const next = searchParams?.get("next");
    return next && next.startsWith("/") ? next : "/dashboard";
  }, [searchParams]);

  const canSubmit = companyName.trim().length > 0 && nif.trim().length > 0;

  async function handleSelect(company: {
    einformaId: string;
    name: string;
    nif: string;
  }) {
    setIsLoadingDetails(true);
    setSelected({
      einformaId: company.einformaId,
      name: company.name,
      legalName: company.name,
      nif: company.nif,
    });
    setCompanyName(company.name);
    setLegalName(company.name);
    setNif(company.nif);

    try {
      const res = await fetch(
        `/api/onboarding/einforma/company?einformaId=${encodeURIComponent(
          company.einformaId
        )}`
      );
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        const info = data.company;
        setSelected({
          einformaId: company.einformaId,
          name: info.name,
          legalName: info.legalName,
          nif: info.nif,
          cnae: info.cnae,
          incorporationDate: info.incorporationDate,
          address: info.address,
          city: info.city,
          province: info.province,
          representative: info.representative,
        });
        setCompanyName(info.name || company.name);
        setLegalName(info.legalName || info.name || company.name);
        setNif(info.nif || company.nif);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/onboarding/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: selected?.einformaId ? "einforma" : "manual",
          einformaId: selected?.einformaId,
          name: companyName.trim(),
          legalName: legalName.trim(),
          nif: nif.trim(),
          extra: selected
            ? {
                cnae: selected.cnae,
                incorporationDate: selected.incorporationDate,
                address: selected.address,
                city: selected.city,
                province: selected.province,
                representative: selected.representative,
              }
            : undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo activar la prueba");
      }

      const trialEndsAt =
        data?.trial?.trialEndsAt || data?.trialEndsAt || null;
      const formattedEndsAt = trialEndsAt
        ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(
            new Date(trialEndsAt)
          )
        : "";

      if (data.action === "REQUEST_ACCESS") {
        showError(
          "Acceso pendiente",
          "Tu usuario no tiene acceso a esta empresa. Contacta con soporte."
        );
        return;
      }

      window.localStorage.setItem(
        "vf_trial_started",
        JSON.stringify({
          tenantName: companyName.trim(),
          trialEndsAt,
        })
      );

      success(
        "Prueba activada",
        `Tienes 30 dias para probar Verifactu + Isaak con tu empresa. La prueba termina el ${formattedEndsAt}.`
      );

      router.push(
        `${nextUrl}?trialStarted=1&trialEndsAt=${encodeURIComponent(
          trialEndsAt || ""
        )}`
      );
    } catch (error) {
      console.error(error);
      showError("Error al activar la prueba", "Vuelve a intentarlo en unos segundos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#0b214a]">
            Anadir tu empresa
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Busca tu empresa en eInforma o crea los datos manualmente. Al continuar
            activaras 30 dias de prueba.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Buscar empresa
              </p>
              <div className="mt-3">
                <EInformaSearch onSelect={handleSelect} />
              </div>
              {isLoadingDetails && (
                <p className="mt-2 text-xs text-slate-500">
                  Cargando datos de eInforma...
                </p>
              )}
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-900">
              <p className="font-semibold">Vas a activar 30 dias de prueba</p>
              <p className="mt-1 text-xs text-blue-800">
                Durante la prueba puedes emitir facturas Verifactu y subir documentacion.
                Antes de cobrar, recibiras un aviso con tu cuota estimada segun tu uso.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Confirmar datos
          </p>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Nombre comercial
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Empresa Demo SL"
                autoComplete="organization"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Razon social
              <input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Empresa Demo SL"
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

            {selected && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Datos cargados desde eInforma. Puedes editarlos si es necesario.
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="w-full rounded-xl bg-[#0b6cfb] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#095edb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Activando prueba..." : "Activar prueba y entrar al panel"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
