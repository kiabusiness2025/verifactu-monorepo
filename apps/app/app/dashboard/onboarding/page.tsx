"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EInformaSearch } from "@/components/companies/EInformaSearch";
import { useToast } from "@/components/notifications/ToastNotifications";
import { EinformaAutofillButton } from "@/src/components/einforma/EinformaAutofillButton";

type SelectedCompany = {
  einformaId?: string;
  name: string;
  legalName?: string;
  nif?: string;
  cnae?: string;
  cnaeCode?: string;
  cnaeText?: string;
  legalForm?: string;
  status?: string;
  email?: string;
  phone?: string;
  employees?: number;
  sales?: number;
  salesYear?: number;
  lastBalanceDate?: string;
  website?: string;
  capitalSocial?: number;
  incorporationDate?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  representative?: string;
  raw?: unknown;
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
  const [hasRealTenant, setHasRealTenant] = useState(false);

  const nextUrl = useMemo(() => {
    const next = searchParams?.get("next");
    return next && next.startsWith("/") ? next : "/dashboard";
  }, [searchParams]);

  const canSubmit = companyName.trim().length > 0 && nif.trim().length > 0;

  useEffect(() => {
    let mounted = true;
    async function loadStatus() {
      try {
        const res = await fetch("/api/onboarding/status", { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (!mounted) return;
        setHasRealTenant(Boolean(data?.hasRealTenant));
      } catch {
        if (!mounted) return;
        setHasRealTenant(false);
      }
    }
    loadStatus();
    return () => {
      mounted = false;
    };
  }, []);

  function applyNormalized(normalized: {
    name?: string | null;
    legalName?: string | null;
    nif?: string | null;
    cnae?: string | null;
    cnaeCode?: string | null;
    cnaeText?: string | null;
    legalForm?: string | null;
    status?: string | null;
    incorporationDate?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    province?: string | null;
    country?: string | null;
    website?: string | null;
    capitalSocial?: number | null;
  }) {
    setSelected((prev) => ({
      ...prev,
      name: prev?.name || normalized.name || "",
      legalName: prev?.legalName || normalized.legalName || normalized.name || "",
      nif: prev?.nif || normalized.nif || "",
      cnae: prev?.cnae || normalized.cnae || null,
      cnaeCode: prev?.cnaeCode || normalized.cnaeCode || null,
      cnaeText: prev?.cnaeText || normalized.cnaeText || null,
      legalForm: prev?.legalForm || normalized.legalForm || null,
      status: prev?.status || normalized.status || null,
      website: prev?.website || normalized.website || null,
      capitalSocial: prev?.capitalSocial || normalized.capitalSocial || null,
      incorporationDate: prev?.incorporationDate || normalized.incorporationDate || null,
      address: prev?.address || normalized.address || null,
      city: prev?.city || normalized.city || null,
      postalCode: prev?.postalCode || normalized.postalCode || null,
      province: prev?.province || normalized.province || null,
      country: prev?.country || normalized.country || null,
    }));

    if (!companyName.trim()) setCompanyName(normalized.name || normalized.legalName || "");
    if (!legalName.trim()) setLegalName(normalized.legalName || normalized.name || "");
    if (!nif.trim()) setNif(normalized.nif || "");
  }

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
        const normalized = data.normalized ?? {};
        setSelected({
          einformaId: company.einformaId,
          name: info.name,
          legalName: info.legalName,
          nif: info.nif,
          cnae: info.cnae,
          cnaeCode: normalized.cnaeCode,
          cnaeText: normalized.cnaeText,
          legalForm: info.legalForm,
          status: info.status,
          email: info.email,
          phone: info.phone,
          employees: info.employees,
          sales: info.sales,
          salesYear: info.salesYear,
          lastBalanceDate: info.lastBalanceDate,
          website: info.website,
          capitalSocial: info.capitalSocial,
          incorporationDate: info.incorporationDate,
          address: info.address,
          city: normalized.city ?? info.city,
          postalCode: normalized.postalCode ?? info.postalCode,
          province: info.province,
          country: normalized.country ?? info.country,
          representative: info.representative,
          raw: info.raw,
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
    if (hasRealTenant) {
      showError(
        "Límite del modo prueba",
        "Ya tienes una empresa real activa en prueba. Para añadir otra, contrata un plan."
      );
      return;
    }
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
                cnaeCode: selected.cnaeCode,
                cnaeText: selected.cnaeText,
                legalForm: selected.legalForm,
                status: selected.status,
                website: selected.website,
                capitalSocial: selected.capitalSocial,
                incorporationDate: selected.incorporationDate,
                address: selected.address,
                postalCode: selected.postalCode,
                city: selected.city,
                country: selected.country,
                province: selected.province,
                representative: selected.representative,
                email: selected.email,
                phone: selected.phone,
                employees: selected.employees,
                sales: selected.sales,
                salesYear: selected.salesYear,
                lastBalanceDate: selected.lastBalanceDate,
                raw: selected.raw,
              }
            : undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        if (data?.action === "TRIAL_LIMIT_REACHED") {
          const billingUrl =
            typeof data?.billingUrl === "string" ? data.billingUrl : "/dashboard/settings?tab=billing";
          showError(
            "Límite del modo prueba",
            "En modo prueba solo puedes usar una empresa real. Te llevamos a planes."
          );
          router.push(billingUrl);
          return;
        }
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
      showError("Error al activar la prueba", "Vuelve a intentarlo en unos seg?ndos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#0b214a]">
            A?adir tu empresa
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Busca tu empresa en eInforma o crea los datos manualmente. Al continuar
            activar?s 30 d?as de prueba.
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
              <p className="font-semibold">Vas a activar 30 d?as de prueba</p>
              <p className="mt-1 text-xs text-blue-800">
                Durante la prueba puedes emitir facturas Verifactu y subir documentaci?n.
                Antes de cobrar, recibir?s un aviso con tu cuota estimada seg?n tu uso.
              </p>
            </div>
            {hasRealTenant ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Ya tienes una empresa real en modo prueba. Para añadir otra empresa, necesitas contratar un plan.
              </div>
            ) : null}
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
              Raz?n social
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
            <EinformaAutofillButton taxIdValue={nif} onApply={applyNormalized} />

            {selected && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Resumen básico
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-slate-500">Nombre:</span> {selected.legalName ?? selected.name ?? "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">CIF/NIF:</span> {selected.nif ?? "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Dirección:</span> {selected.address ?? "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Localidad:</span>{" "}
                    {[selected.postalCode, selected.city, selected.province].filter(Boolean).join(" ") || "—"}
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              En modo prueba solo puedes usar una empresa con datos reales. Revisa bien estos datos principales:
              después de guardar no podrás modificarlos desde este flujo.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting || hasRealTenant}
                className="w-full rounded-xl bg-[#0b6cfb] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#095edb] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
