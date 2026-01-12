import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, RefreshCcw, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Automatización | Verifactu Business",
  description:
    "Flujos automáticos para facturar, cumplir VeriFactu y reducir errores.",
};

const flows = [
  {
    title: "Factura -> Validación",
    description: "Genera, valida y registra sin pasos manuales.",
    icon: RefreshCcw,
  },
  {
    title: "Alertas inteligentes",
    description: "Isaak detecta incoherencias y propone correcciones.",
    icon: Bot,
  },
  {
    title: "Cumplimiento continuo",
    description: "Trazabilidad y conservación siempre activas.",
    icon: ShieldCheck,
  },
];

export default function AutomatizacionPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50/70 via-white to-white">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0060F0] hover:text-[#0080F0]"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-[#002060] sm:text-5xl">
              Automatización sin fricción
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Menos tareas repetitivas, menos errores y más tiempo para tu negocio.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-6 py-3 text-sm font-semibold text-white hover:from-[#0056D6] hover:to-[#1AA3DB]"
              >
                Empezar 1 mes gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-xl border border-[#0060F0] px-6 py-3 text-sm font-semibold text-[#0060F0] hover:bg-[#0060F0]/10"
              >
                Ver demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-3">
            {flows.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0060F0]/10">
                  <item.icon className="h-6 w-6 text-[#0060F0]" />
                </div>
                <h2 className="text-lg font-semibold text-[#002060]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-3xl border border-[#0060F0]/15 bg-gradient-to-br from-sky-50/70 to-white p-10">
            <h2 className="text-2xl font-semibold text-[#002060]">
              Isaak como copiloto
            </h2>
            <p className="mt-4 text-slate-600">
              Isaak revisa tus datos y te avisa antes de que haya errores o
              incoherencias.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
