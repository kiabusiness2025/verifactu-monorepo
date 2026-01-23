import type { Metadata } from "next";
import Link from "next/link";
import { getLandingUrl, getAppUrl } from "../../lib/urls";
import { CheckCircle2, ArrowRight, TrendingUp, FileText, Calculator } from "lucide-react";

export const metadata: Metadata = {
  title: "Resumen del producto | Verifactu Business",
  description: "Ventas, gastos y beneficio en una sola pantalla con cumplimiento VeriFactu.",
};

const highlights = [
  {
    title: "Dashboard de beneficio",
    description: "Ves ventas, gastos y beneficio real en segundos.",
    icon: TrendingUp,
  },
  {
    title: "Registro de ventas",
    description: "Emite facturas claras y conformes con VeriFactu.",
    icon: FileText,
  },
  {
    title: "Control de gastos",
    description: "Clasifica gastos y controla IVA sin hojas de calculo.",
    icon: Calculator,
  },
];

export default function ProductSummaryPage() {
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

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
              <CheckCircle2 className="h-4 w-4 text-[#2361d8]" />
              Producto
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#2361d8] sm:text-5xl">
              Tu negocio bajo control, sin complicaciones
            </h1>
            <p className="mt-4 text-xl text-slate-600">
              Verifactu Business unifica ventas, gastos y cumplimiento VeriFactu en una sola pantalla. Isaak te guia
              para decidir sin dudas en cierre 2025 y T1 2026.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
              >
                Empezar 1 mes gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={isaakChatUrl}
                className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Hablar con Isaak
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#2361d8]/10">
                  <item.icon className="h-6 w-6 text-[#2361d8]" />
                </div>
                <h2 className="text-lg font-semibold text-[#2361d8]">{item.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-3xl border border-[#2361d8]/15 bg-gradient-to-br from-sky-50/70 to-white p-10">
            <h2 className="text-2xl font-semibold text-[#2361d8]">Lo esencial, sin ruido</h2>
            <ul className="mt-6 space-y-3 text-slate-700">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2361d8]" />
                Facturas y gastos siempre ordenados.
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2361d8]" />
                Cumplimiento VeriFactu automatizado.
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2361d8]" />
                Isaak responde en segundos y evita errores.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-[#2361d8]">Empieza hoy y recupera el control</h2>
          <p className="mt-4 text-lg text-slate-600">1 mes gratis, sin tarjeta y sin friccion.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
            >
              Empezar 1 mes gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/#precios"
              className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}


