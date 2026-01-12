import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, ShieldCheck, FileText, Hash } from "lucide-react";

export const metadata: Metadata = {
  title: "Cumplimiento VeriFactu | Verifactu Business",
  description:
    "Cómo Verifactu Business cumple el RD 1007/2023: integridad, trazabilidad y evidencias.",
};

const evidencias = [
  {
    title: "Registro encadenado por documento",
    detail:
      "Cada documento queda enlazado con el anterior, de forma que cualquier cambio posterior deja rastro.",
    icon: <Hash className="h-5 w-5 text-blue-700" />,
  },
  {
    title: "Fecha y trazabilidad",
    detail:
      "Guardamos la fecha de alta y los cambios relevantes (estado, envíos y anulaciones permitidas).",
    icon: <ShieldCheck className="h-5 w-5 text-blue-700" />,
  },
  {
    title: "Historial de eventos",
    detail:
      "Los eventos críticos (creación, validación, envío y modificaciones permitidas) quedan registrados para consulta.",
    icon: <FileText className="h-5 w-5 text-blue-700" />,
  },
  {
    title: "Evidencias del documento",
    detail:
      "Conservamos evidencias para identificar la versión exacta enviada o descargada.",
    icon: <CheckCircle2 className="h-5 w-5 text-blue-700" />,
  },
];

const cumplimos = [
  "Integridad y secuencialidad: evitamos cambios posteriores sin rastro.",
  "Trazabilidad completa: historial de eventos con fecha.",
  "Conservación: custodia de evidencias y huellas durante los plazos legales.",
  "Disponibilidad: exportación de libros y evidencias bajo demanda para auditoría.",
];

export default function VerifactuPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-white text-slate-900">
      <section className="py-14">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <div className="mb-4 text-sm">
            <Link
              href="/"
              className="text-blue-700 font-semibold hover:text-blue-800"
              aria-label="Volver al inicio"
            >
              Volver al inicio
            </Link>
          </div>
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
              <ShieldCheck className="h-4 w-4 text-blue-700" />
              Cumplimiento VeriFactu (RD 1007/2023)
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Cómo cumplimos VeriFactu</h1>
            <p className="text-lg text-slate-700">
              Te mostramos cómo cuidamos la integridad, la trazabilidad y la conservación de tus registros VeriFactu.
            </p>
          </div>

          <div className="mt-10 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Qué cumplimos exactamente</h2>
            <ul className="space-y-3 text-sm text-slate-700">
              {cumplimos.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-700" />
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
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
              <li>• Libro de facturas emitidas/recibidas con evidencias de integridad y fechas.</li>
              <li>• Evidencias de documentos y referencia a versiones enviadas/descargadas.</li>
              <li>• Historial de eventos (creación, validación, envíos y anulaciones permitidas) consultable.</li>
              <li>• Informe de consistencia bajo demanda.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
