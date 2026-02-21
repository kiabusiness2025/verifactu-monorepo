import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Video, ArrowRight, Calendar } from "lucide-react";
import { getLandingUrl, getAppUrl } from "../../lib/urls";

export const metadata: Metadata = {
  title: "Guías y webinars | Verifactu Business",
  description: "Recursos claros para cumplir VeriFactu y cerrar 2025 con un arranque 2026 sin sorpresas.",
};

const guides = [
  {
    title: "Guía rápida VeriFactu 2026",
    description: "Qué exige la AEAT y cómo cumplir sin errores.",
    meta: "PDF + video",
  },
  {
    title: "Cierre 2025 paso a paso",
    description: "Ventas, gastos, evidencias y checklist final.",
    meta: "Checklist",
  },
  {
    title: "T1 2026 sin nervios",
    description: "Plazos, modelos y alertas claras en enero, febrero y marzo.",
    meta: "Calendario",
  },
];

export default function GuiasPage() {
  const isaakChatUrl = `${getAppUrl()}/dashboard?isaak=1`;
  return (
    <main className="min-h-screen bg-[#2361d8]/5">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Link
            href={getLandingUrl()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#2361d8] hover:text-[#2361d8]"
          >
            Volver al inicio
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/20">
            <BookOpen className="h-4 w-4" />
            Recursos guiados
          </div>
          <h1 className="mt-4 text-4xl font-bold text-[#011c67]">Guías y webinars</h1>
          <p className="mt-4 text-lg text-slate-600">
            Recursos claros, en lenguaje llano, para que cumplas VeriFactu y tengas control real de tu negocio.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {guides.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#2361d8]/5 px-3 py-1 text-xs font-semibold text-[#2361d8]">
                <Video className="h-3.5 w-3.5" />
                {item.meta}
              </div>
              <h2 className="text-xl font-semibold text-[#011c67]">{item.title}</h2>
              <p className="mt-3 text-sm text-slate-600">{item.description}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
                Proximamente
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <Calendar className="h-4 w-4" />
            Pide una guía
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Si necesitas una guía concreta, cuéntanos tu caso y la priorizamos.
          </p>
          <div className="mt-4">
            <Link
              href="/recursos/contacto"
              className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-5 py-2 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
            >
              Solicitar guía
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/#planes"
            className="inline-flex items-center justify-center rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
          >
            Calcular precio
          </Link>
          <Link
            href={isaakChatUrl}
            className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
          >
            Hablar con Isaak
          </Link>
        </div>
      </section>
    </main>
  );
}


