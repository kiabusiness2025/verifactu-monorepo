import type { Metadata } from "next";
import Link from "next/link";
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
  "Impuestos aplicados segun normativa.",
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
        <h1 className="text-4xl font-bold text-[#2361d8]">Checklist VeriFactu</h1>
        <p className="mt-4 text-lg text-slate-600">
          Un resumen rapido de lo que necesitas revisar antes de emitir. Isaak te avisa si falta algo.
        </p>

        <ul className="mt-8 space-y-3">
          {checklist.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-slate-200 bg-white p-4 text-slate-700 shadow-sm"
            >
              {item}
            </li>
          ))}
        </ul>

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


