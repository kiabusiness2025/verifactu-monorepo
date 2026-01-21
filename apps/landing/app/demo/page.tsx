"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import PricingCalculatorInline from "../components/PricingCalculatorInline";

type DemoFormState = {
  name: string;
  email: string;
  company: string;
  website: string;
  sector: string;
  teamSize: string;
  invoices: string;
  movements: string;
  phone: string;
  notes: string;
};

function isValidEmail(email: string) {
  return /.+@.+\..+/.test(email);
}

function DemoRequestModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<DemoFormState>({
    name: "",
    email: "",
    company: "",
    website: "",
    sector: "",
    teamSize: "",
    invoices: "",
    movements: "",
    phone: "",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(() => {
    return form.name.trim().length > 0 && isValidEmail(form.email.trim());
  }, [form.email, form.name]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || status === "sending") return;

    setStatus("sending");
    setErrorMessage("");

    const messageLines = [
      "Solicitud demo personalizada",
      `Empresa: ${form.company || "-"}`,
      `Web: ${form.website || "-"}`,
      `Sector: ${form.sector || "-"}`,
      `Tamano equipo: ${form.teamSize || "-"}`,
      `Facturas/mes: ${form.invoices || "-"}`,
      `Movimientos/mes: ${form.movements || "-"}`,
      `Telefono: ${form.phone || "-"}`,
      `Notas: ${form.notes || "-"}`,
    ];

    try {
      const res = await fetch("/api/send-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim() || undefined,
          message: messageLines.join("\n"),
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo enviar");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "No se pudo enviar");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
          aria-label="Cerrar"
        >
          X
        </button>

        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-[#002060]">
            Solicitar demo personalizada para tu empresa
          </h2>
          <p className="text-sm text-slate-600">
            Paso 1: crea tu cuenta. Paso 2: completa este formulario. Te
            activaremos una demo con tus datos.
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/auth/signup"
              className="rounded-lg bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-3 py-2 font-semibold text-white hover:from-[#0056D6] hover:to-[#1AA3DB]"
            >
              Crear cuenta
            </Link>
            <Link
              href="/auth/login"
              className="rounded-lg border border-[#0060F0] px-3 py-2 font-semibold text-[#0060F0] hover:bg-[#0060F0]/10"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Nombre
            <input
              value={form.name}
              onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Tu nombre"
              autoComplete="name"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Email
            <input
              value={form.email}
              onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Empresa
            <input
              value={form.company}
              onChange={(e) => setForm((v) => ({ ...v, company: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Empresa Demo SL"
              autoComplete="organization"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Web
            <input
              value={form.website}
              onChange={(e) => setForm((v) => ({ ...v, website: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="https://"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Sector
            <input
              value={form.sector}
              onChange={(e) => setForm((v) => ({ ...v, sector: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Servicios, comercio, etc."
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Tamano de equipo
            <input
              value={form.teamSize}
              onChange={(e) => setForm((v) => ({ ...v, teamSize: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="1-5, 6-10, 10+"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Facturas/mes
            <input
              value={form.invoices}
              onChange={(e) => setForm((v) => ({ ...v, invoices: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Ej. 80"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Movimientos/mes
            <input
              value={form.movements}
              onChange={(e) => setForm((v) => ({ ...v, movements: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Ej. 120"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Telefono (opcional)
            <input
              value={form.phone}
              onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="+34 600 000 000"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700 sm:col-span-2">
            Notas
            <textarea
              value={form.notes}
              onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))}
              className="min-h-[90px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Cuentanos lo que necesitas ver en la demo."
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={!canSubmit || status === "sending" || status === "success"}
              className="w-full rounded-xl bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-4 py-3 text-sm font-semibold text-white hover:from-[#0056D6] hover:to-[#1AA3DB] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "sending"
                ? "Enviando..."
                : status === "success"
                  ? "Solicitud enviada"
                  : "Enviar solicitud"}
            </button>
            {status === "error" ? (
              <p className="mt-2 text-sm text-rose-600">{errorMessage}</p>
            ) : null}
            {status === "success" ? (
              <p className="mt-2 text-sm text-emerald-700">
                Perfecto. Te contactamos con una demo personalizada.
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DemoPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  const demoNavLinks = [
    { label: "Home", href: "/" },
    { label: "Calculadora", href: "#calculadora" },
    { label: "Solicitar demo personalizada", href: "#solicitar-demo" },
  ];

  const checkoutParam =
    typeof searchParams?.checkout === "string" ? searchParams.checkout : undefined;
  const showCheckoutSuccess = checkoutParam === "success";

  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Header navLinks={demoNavLinks} />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {showCheckoutSuccess && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <div className="font-semibold">Gracias. Todo listo.</div>
            <div className="mt-1 text-emerald-800">
              Stripe ha confirmado el pago. En breve recibiras un email de
              confirmacion.
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50/70 px-3 py-1 text-[11px] font-semibold text-[#0080F0] ring-1 ring-[#0080F0]/15">
              Demo guiada
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#0060F0] ring-1 ring-[#0060F0]/20">
                2 min
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#002060] sm:text-4xl">
              Pruebalo sin miedo. Todo ya esta listo.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Entra, toca botones y revisa el panel. Esta vista previa es segura
              y usa datos de ejemplo para enero 2026.
            </p>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-[#002060]">
                Que ver en 30 segundos
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Panel con ventas, gastos y beneficio en un vistazo.</li>
                <li>Flujo Factura {'->'} Validacion {'->'} Envio VeriFactu.</li>
                <li>Isaak sugiriendo acciones utiles por seccion.</li>
              </ul>
            </div>

            <div id="solicitar-demo" className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setIsRequestOpen(true)}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-[#0056D6] hover:to-[#1AA3DB]"
              >
                Solicitar demo personalizada
              </button>
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-xl border border-[#0060F0] px-5 py-3 text-sm font-semibold text-[#0060F0] hover:bg-[#0060F0]/10"
              >
                Crear cuenta
              </Link>
            </div>
            <div className="text-xs text-slate-500">
              1 mes gratis, sin permanencia.
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-[#002060]">Que pasa despues</div>
              <ol className="mt-3 list-decimal pl-5 text-sm text-slate-600">
                <li>Creas tu cuenta y confirmas tu empresa.</li>
                <li>Emites 1 factura de prueba o importas datos.</li>
                <li>Isaak te entrega un resumen mensual al momento.</li>
              </ol>
            </div>

            <div className="text-sm text-slate-600">
              <button
                onClick={() => {
                  const el = document.getElementById("calculadora");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="font-semibold text-[#0060F0] hover:text-[#0080F0]"
                type="button"
              >
                Calcula tu precio
              </button>
              <span className="px-2 text-slate-400">.</span>
              <Link className="font-semibold text-[#0060F0] hover:text-[#0080F0]" href="/">
                Volver a Home
              </Link>
            </div>

            <ul className="grid gap-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-[#0080F0]" />
                Vista previa con datos de ejemplo, sin riesgo.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-[#0080F0]" />
                Para activar la demo personalizada, necesitamos tu registro y el formulario.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-[#0080F0]" />
                Te contactamos para preparar la demo con tus datos.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
                <p className="text-xs font-semibold text-slate-600">
                  Vista previa (mock)
                </p>
                <span className="text-xs font-semibold text-[#0060F0]">
                  Solo ejemplo
                </span>
              </div>
              <div className="grid gap-4 p-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Resumen mensual
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-white p-3 shadow-sm">
                      <div className="text-[11px] text-slate-500">Ventas</div>
                      <div className="mt-1 text-lg font-semibold text-[#002060]">
                        18.240 EUR
                      </div>
                    </div>
                    <div className="rounded-lg bg-white p-3 shadow-sm">
                      <div className="text-[11px] text-slate-500">Gastos</div>
                      <div className="mt-1 text-lg font-semibold text-[#002060]">
                        6.430 EUR
                      </div>
                    </div>
                    <div className="rounded-lg bg-white p-3 shadow-sm">
                      <div className="text-[11px] text-slate-500">Beneficio</div>
                      <div className="mt-1 text-lg font-semibold text-[#002060]">
                        11.810 EUR
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    Actividad reciente
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div>Factura #F-1024 - 1.240 EUR - Enviada</div>
                    <div>Gasto Proveedor - 180 EUR - Registrado</div>
                    <div>Factura #F-1025 - 980 EUR - Pendiente</div>
                  </div>
                </div>
                <div className="rounded-xl border border-[#0060F0]/20 bg-gradient-to-r from-sky-50/70 to-white p-4">
                  <div className="text-sm font-semibold text-[#002060]">
                    Isaak
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    "Te ayudo con cierre 2025 y enero 2026. Revisamos?"
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              La demo personalizada se activa tras registro y validacion de tu empresa.
            </p>
          </section>
        </div>

        <section id="calculadora" className="mt-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#002060]">
                  Calcula tu precio personalizado
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Sin cuotas fijas. Pagas segun tu uso real: facturas emitidas y
                  movimientos conciliados.
                </p>
              </div>
              <Link
                href="/auth/signup"
                className="text-sm font-semibold text-[#0060F0] hover:text-[#0080F0]"
              >
                Activar prueba gratuita
              </Link>
            </div>

            <div className="mt-6">
              <PricingCalculatorInline />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Sin permanencias
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Cancela cuando quieras, sin penalizaciones.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  1 mes gratis
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Prueba completa sin tarjeta ni compromiso.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Aviso antes de cobrar
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Te avisamos antes de renovar para que ajustes el plan.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#0060F0]/15 bg-gradient-to-r from-sky-50/70 to-white p-4 text-sm text-slate-700">
              Si ya estas convencido, calcula tu precio y activa la prueba gratuita.
            </div>
          </div>
        </section>
      </div>

      <DemoRequestModal
        isOpen={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
      />

      <footer className="mt-12 border-t border-slate-200 bg-white/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-semibold text-slate-800">Verifactu Business</span>
          <div className="flex flex-wrap gap-3 text-xs">
            <Link className="hover:text-[#0080F0]" href="/" aria-label="Ir a pagina de inicio">
              Ir a Home
            </Link>
            <Link className="hover:text-[#0080F0]" href="/auth/signup" aria-label="Crear nueva cuenta">
              Crear cuenta
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}





