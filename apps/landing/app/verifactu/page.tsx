import Link from "next/link";
import { getLandingUrl, getAppUrl } from "../lib/urls";
import type { Metadata } from "next";
import { CheckCircle2, ShieldCheck, FileText, Hash, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Cumplimiento VeriFactu | Verifactu Business",
  description: "Cómo Verifactu Business cumple el RD 1007/2023: integridad, trazabilidad y evidencias.",
};

const evidencias = [
  {
    title: "Registro encadenado por documento",
    detail:
      "Cada documento queda enlazado con el anterior, de forma que cualquier cambio deja rastro.",
    icon: <Hash className="h-5 w-5 text-[#2361d8]" />,
  },
  {
    title: "Fecha y trazabilidad",
    detail: "Guardamos fecha de alta y cambios relevantes (estado, envios y anulaciones permitidas).",
    icon: <ShieldCheck className="h-5 w-5 text-[#2361d8]" />,
  },
  {
    title: "Historial de eventos",
    detail: "Eventos criticos (creacion, validacion, envio y modificaciones) quedan registrados.",
    icon: <FileText className="h-5 w-5 text-[#2361d8]" />,
  },
  {
    title: "Evidencias del documento",
    detail: "Conservamos evidencias para identificar la version exacta enviada o descargada.",
    icon: <CheckCircle2 className="h-5 w-5 text-[#2361d8]" />,
  },
];

const cumplimos = [
  "Integridad y secuencialidad: evitamos cambios posteriores sin rastro.",
  "Trazabilidad completa: historial de eventos con fecha.",
  "Conservación: custodia de evidencias durante los plazos legales.",
  "Disponibilidad: exportación de libros y evidencias bajo demanda para auditoría.",
];

export default function VerifactuPage() {
  const isaakChatUrl = `${getAppUrl()}/dashboard?isaak=1`;
  return (
    <main className="min-h-screen bg-[#2361d8]/5 text-slate-900">
      <section className="py-14">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <div className="mb-4 text-sm">
            <Link
              href={getLandingUrl()}
              className="text-[#2361d8] font-semibold hover:text-[#1f55c0]"
              aria-label="Volver al inicio"
            >
              Volver al inicio
            </Link>
          </div>
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
              <ShieldCheck className="h-4 w-4 text-[#2361d8]" />
              Cumplimiento VeriFactu (RD 1007/2023)
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-[#011c67] sm:text-5xl">
              Cómo cumplimos VeriFactu
            </h1>
            <p className="text-lg text-slate-700">
              Mostramos como cuidamos integridad, trazabilidad y conservacion de tus registros. Ideal para el cierre
              2025 y el arranque del T1 2026.
            </p>
          </div>

          <div className="mt-10 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Que cumplimos exactamente</h2>
            <ul className="space-y-3 text-sm text-slate-700">
              {cumplimos.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#2361d8]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {evidencias.map((ev) => (
              <div
                key={ev.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2361d8]/10">
                    {ev.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{ev.title}</h3>
                    <p className="mt-1 text-sm text-slate-700 leading-6">{ev.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Exportables y evidencias</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Libro de facturas emitidas/recibidas con evidencias de integridad y fechas.</li>
              <li>Evidencias de documentos y referencia a versiones enviadas/descargadas.</li>
              <li>Historial de eventos consultable (creacion, validacion, envios y anulaciones).</li>
              <li>Informe de consistencia bajo demanda.</li>
            </ul>
          </div>

          <div className="mt-8 rounded-3xl border border-[#2361d8]/15 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#011c67]">Fuentes oficiales</h2>
            <p className="mt-2 text-sm text-slate-600">
              Para documentacion oficial y normativa, consulta los canales de la Agencia Tributaria:
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="https://www.agenciatributaria.es/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/5 px-4 py-2 text-sm font-semibold text-[#2361d8]"
              >
                Agencia Tributaria
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href="https://sede.agenciatributaria.gob.es/Sede/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#2361d8]/20 bg-[#2361d8]/5 px-4 py-2 text-sm font-semibold text-[#2361d8]"
              >
                Sede electrónica
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">¿Quieres que Isaak lo deje listo contigo?</div>
            <div className="flex gap-3">
              <Link
                href="/auth/signup"
                className="rounded-full bg-[#2361d8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f55c0]"
              >
                Probar con Isaak
              </Link>
              <Link
                href={isaakChatUrl}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-200"
              >
                Abrir chat
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

