import type { Metadata } from "next";
import Link from "next/link";
import { getLandingUrl, getAppUrl } from "../../lib/urls";
import { ArrowRight, ShieldCheck, FileCheck2, LayoutDashboard } from "lucide-react";

export const metadata: Metadata = {
  title: "Plataforma | Verifactu Business",
  description: "Una plataforma clara para facturar, cumplir VeriFactu y entender tu negocio.",
};

const modules = [
  {
    title: "Panel unificado",
    description: "Ventas, gastos y beneficio en un solo lugar.",
    icon: LayoutDashboard,
  },
  {
    title: "Cumplimiento VeriFactu",
    description: "Emision y trazabilidad conforme a la normativa.",
    icon: FileCheck2,
  },
  {
    title: "Seguridad y acceso",
    description: "Acceso seguro, roles y datos protegidos.",
    icon: ShieldCheck,
  },
];

export default function PlataformaPage() {
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
            <h1 className="text-4xl font-bold text-[#2361d8] sm:text-5xl">
              La plataforma que simplifica tu gestion diaria
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Todo lo esencial para emitir, controlar y cumplir, sin pantallas innecesarias. Isaak te acompana en el
              cierre 2025 y el arranque del T1 2026.
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
            {modules.map((item) => (
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
            <h2 className="text-2xl font-semibold text-[#2361d8]">Disenada para equipos pequenos</h2>
            <p className="mt-4 text-slate-600">
              Pensada para PYMEs que quieren facturar y cumplir sin herramientas complejas.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#precios"
                className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
              >
                Ver planes
              </Link>
              <Link
                href="/presupuesto"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Solicitar presupuesto
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


