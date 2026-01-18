import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Checklist | Verifactu Business",
  description:
    "Checklist práctico para emitir facturas conforme a VeriFactu.",
};

const checklist = [
  "Datos fiscales completos del emisor y receptor.",
  "Numeración correlativa sin saltos.",
  "Fecha de emisión correcta y sin duplicados.",
  "Concepto claro y descripción suficiente.",
  "Impuestos aplicados según normativa.",
  "Registro y conservación de facturas.",
  "Trazabilidad para auditorías y verificación.",
];

export default function ChecklistPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50/70 via-white to-white">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <Link
            href={getLandingUrl()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0060F0] hover:text-[#0080F0]"
          >
            â† Volver al inicio
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-4xl font-bold text-[#002060]">
          Checklist VeriFactu
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Un resumen rápido de lo que necesitas revisar antes de emitir.
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
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-6 py-3 text-sm font-semibold text-white hover:from-[#0056D6] hover:to-[#1AA3DB]"
          >
            Ver planes
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center rounded-xl border border-[#0060F0] px-6 py-3 text-sm font-semibold text-[#0060F0] hover:bg-[#0060F0]/10"
          >
            Solicitar demo
          </Link>
        </div>
      </section>
    </main>
  );
}

