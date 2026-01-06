import React from "react";
import Link from "next/link";
import { DemoLeadForm } from "./DemoLeadForm";

export default function DemoPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const demoHref = `${appUrl.replace(/\/$/, "")}/app`;

  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-800 ring-1 ring-blue-100">
              Demo guiada
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-600 ring-1 ring-blue-200">
                2 min
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Pruébalo sin miedo. Todo ya está listo.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Entra, toca botones, abre Isaak y mira el panel. Es una demo segura para entender cómo funciona,
              con datos de ejemplo y sin riesgo.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={demoHref}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Abrir en pantalla completa
              </a>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Volver a Home
              </Link>
            </div>

            <ul className="grid gap-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                Abre Isaak y verás sugerencias contextuales según la sección.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                Facturas y documentos usan datos de prueba; nada es real ni sensible.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                Si quieres una demo personalizada, deja tu email abajo.
              </li>
            </ul>

            <DemoLeadForm />
          </section>

          <section className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
                <p className="text-xs font-semibold text-slate-600">Vista previa</p>
                <a href={demoHref} className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                  Abrir
                </a>
              </div>
              <iframe
                title="Demo Verifactu"
                src={demoHref}
                className="h-[640px] w-full"
                allow="clipboard-read; clipboard-write"
              />
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Si no carga aquí, ábrela en pantalla completa.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
