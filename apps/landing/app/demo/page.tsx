import React from "react";
import Link from "next/link";
import { DemoLeadForm } from "./DemoLeadForm";

export default function DemoPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const demoHref = `${appUrl.replace(/\/$/, "")}/app`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Demo</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Pruébalo en 2 minutos
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Entra, toca botones, abre Isaak y mira el panel. Es una demo pensada para entenderlo sin miedo.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={demoHref}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Abrir en pantalla completa
            </a>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Volver a Home
            </Link>
          </div>

          <div className="mt-8">
            <DemoLeadForm />
          </div>
        </div>

        <div className="flex-1">
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
              className="h-[720px] w-full"
              allow="clipboard-read; clipboard-write"
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Si no carga aquí, ábrela en pantalla completa.
          </p>
        </div>
      </div>
    </main>
  );
}
