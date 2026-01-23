import type { Metadata } from "next";
import Link from "next/link";
import { getLandingUrl, getAppUrl } from "../../lib/urls";

export const metadata: Metadata = {
  title: "Guias y webinars | Verifactu Business",
  description: "Recursos claros para cumplir VeriFactu y cerrar 2025 con un arranque 2026 sin sorpresas.",
};

const guides = [
  {
    title: "Guia rapida VeriFactu 2026",
    description: "Que exige la AEAT y como cumplir sin errores.",
  },
  {
    title: "Cierre 2025 paso a paso",
    description: "Ventas, gastos, evidencias y checklist final.",
  },
  {
    title: "T1 2026 sin nervios",
    description: "Plazos, modelos y alertas claras en enero, febrero y marzo.",
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
          <h1 className="text-4xl font-bold text-[#2361d8]">Guias y webinars</h1>
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
              <h2 className="text-xl font-semibold text-[#2361d8]">{item.title}</h2>
              <p className="mt-3 text-sm text-slate-600">{item.description}</p>
              <div className="mt-6 text-sm text-[#2361d8] hover:text-[#2361d8]">Proximamente</div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/#precios"
            className="inline-flex items-center justify-center rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
          >
            Ver planes
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


