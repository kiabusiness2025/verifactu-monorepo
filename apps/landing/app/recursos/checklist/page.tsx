import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ListChecks, ArrowRight } from "lucide-react";
import { getLandingUrl, getAppUrl } from "../../lib/urls";

export const metadata: Metadata = {
  title: "Checklist | Verifactu Business",
  description: "Checklist practico para emitir facturas conforme a VeriFactu en 2026.",
};

const checklist = [
  "Datos fiscales completos del emisor y receptor.",
  "Numeracion correlativa sin saltos.",
  "Fecha de emision correcta y sin duplicados.",
  "Concepto claro y descripcion suficiente.",
  "Impuestos aplicados según normativa.",
  "Registro y conservacion de facturas.",
  "Trazabilidad para auditorias y verificacion.",
  "Cierre 2025 revisado y T1 2026 con plazos claros.",
];

export default function ChecklistPage() {
  const isaakChatUrl = `${getAppUrl()}/dashboard?isaak=1`;
  return (
    <main className="min-h-screen bg-[#2361d8]/5">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link
            href={getLandingUrl()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#2361d8] hover:text-[#2361d8]"
          >
            Volver al inicio
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/20">
          <ListChecks className="h-4 w-4" />
          Checklist operativo
        </div>
        <h1 className="mt-4 text-4xl font-bold text-[#011c67]">Checklist VeriFactu</h1>
        <p className="mt-4 text-lg text-slate-600">
          Un resumen rapido de lo que necesitas revisar antes de emitir. Isaak te avisa si falta algo.
        </p>

        <div className="mt-8 grid gap-3">
          {checklist.map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-700 shadow-sm"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#2361d8]" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-[#2361d8]">Te lo revisa Isaak</div>
          <p className="mt-2 text-sm text-slate-600">
            Sube documentos y Isaak detecta incoherencias antes de que envíes la factura.
          </p>
          <div className="mt-4">
            <Link
              href={isaakChatUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2361d8] px-5 py-2 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
            >
              Revisar con Isaak
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
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


