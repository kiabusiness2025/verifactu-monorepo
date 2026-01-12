"use client";

import React, { useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import { DemoLeadForm } from "./DemoLeadForm";
import PricingCalculatorModal from "../components/PricingCalculatorModal";

export default function DemoPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const appUrl =
    configuredAppUrl ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://app.verifactu.business");
  const demoHref = appUrl ? `${appUrl.replace(/\/$/, "")}/demo` : null;
  const demoNavLinks = [
    { label: "Home", href: "/" },
    { label: "Calculadora", href: "#calculadora" },
    ...(demoHref ? [{ label: "Abrir demo", href: demoHref }] : []),
  ];

  const checkoutParam = typeof searchParams?.checkout === "string" ? searchParams.checkout : undefined;
  const showCheckoutSuccess = checkoutParam === "success";

  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Header navLinks={demoNavLinks} />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {showCheckoutSuccess && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <div className="font-semibold">Gracias. Todo listo.</div>
            <div className="mt-1 text-emerald-800">
              Stripe ha confirmado el pago. En breve recibirás un email de confirmación.
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
              Pruébalo sin miedo. Todo ya está listo.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Entra, toca botones, abre Isaak y mira el panel. Es una demo segura para entender cómo funciona,
              con datos de ejemplo y sin riesgo.
            </p>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-[#002060]">Qué ver en 30 segundos</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Panel con ventas, gastos y beneficio en un vistazo.</li>
                <li>Flujo Factura → Validación → Envío VeriFactu.</li>
                <li>Isaak sugiriendo acciones útiles por sección.</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {demoHref ? (
                <a
                  href={demoHref}
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-[#0056D6] hover:to-[#1AA3DB]"
                >
                  Abrir demo
                </a>
              ) : (
                <div
                  className="inline-flex items-center justify-center rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
                  aria-disabled="true"
                >
                  Vista previa no disponible
                </div>
              )}
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
              <span className="px-2 text-slate-400">·</span>
              <Link className="font-semibold text-[#0060F0] hover:text-[#0080F0]" href="/">
                Volver a Home
              </Link>
            </div>

            <ul className="grid gap-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-[#0080F0]" />
                Abre Isaak y verás sugerencias contextuales según la sección.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-[#0080F0]" />
                Facturas y documentos usan datos de prueba; nada es real ni sensible.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-[#0080F0]" />
                Si quieres una demo personalizada, deja tu email abajo.
              </li>
            </ul>

            <DemoLeadForm />
          </section>

          <section className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
                <p className="text-xs font-semibold text-slate-600">Vista previa</p>
                {demoHref ? (
                  <a href={demoHref} className="text-xs font-semibold text-[#0060F0] hover:text-[#0080F0]">
                    Abrir demo
                  </a>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">No disponible</span>
                )}
              </div>
              {demoHref ? (
                <iframe
                  title="Demo Verifactu"
                  src={demoHref}
                  className="h-[640px] w-full"
                  allow="clipboard-read; clipboard-write"
                />
              ) : (
                <div className="flex h-[640px] w-full items-center justify-center bg-white px-6 text-center">
                  <div className="max-w-md">
                    <div className="text-sm font-semibold text-slate-900">La vista previa no está disponible ahora.</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      Mientras tanto, puedes revisar los planes o pedir una demo personalizada.
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Si no carga aquí, ábrela en pantalla completa.
            </p>
          </section>
        </div>

        <section id="calculadora" className="mt-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#002060]">Calcula tu precio personalizado</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Sin cuotas fijas. Pagas según tu uso real: facturas emitidas y movimientos conciliados.
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
              <button
                onClick={() => setIsCalculatorOpen(true)}
                className="w-full rounded-2xl border border-[#0060F0]/25 bg-sky-50/70 p-6 text-left transition hover:bg-sky-50"
              >
                <div className="text-lg font-semibold text-slate-900">Abre la calculadora interactiva</div>
                <div className="mt-1 text-sm text-slate-600">
                  Ajusta facturas y movimientos para ver tu cuota exacta
                </div>
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Sin permanencias</div>
                <p className="mt-1 text-xs text-slate-600">Cancela cuando quieras, sin penalizaciones.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">1 mes gratis</div>
                <p className="mt-1 text-xs text-slate-600">Prueba completa sin tarjeta ni compromiso.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Aviso antes de cobrar</div>
                <p className="mt-1 text-xs text-slate-600">Te avisamos antes de renovar para que ajustes el plan.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <PricingCalculatorModal isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />

      <footer className="mt-12 border-t border-slate-200 bg-white/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="font-semibold text-slate-800">Verifactu Business</span>
          <div className="flex flex-wrap gap-3 text-xs">
            <Link className="hover:text-[#0080F0]" href="/" aria-label="Ir a página de inicio">
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
