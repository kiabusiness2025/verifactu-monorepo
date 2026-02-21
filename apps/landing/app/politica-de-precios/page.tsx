import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, CreditCard, FileText, Info, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de precios | Verifactu Business",
  description:
    "Cómo se calcula el precio, qué se incluye en la cuota y cómo medimos el uso en Verifactu Business.",
};

export default function PoliticaDePreciosPage() {
  return (
    <main className="bg-[#2361d8]/5">
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2361d8] ring-1 ring-[#2361d8]/20">
          <Calculator className="h-4 w-4" />
          Política de precios
        </div>
        <h1 className="mt-4 text-4xl font-bold text-[#011c67]">Precios y medición de uso</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Tu cuota mensual se compone de base y tramos de uso (facturas y, si activas conciliación, movimientos
          bancarios). Los importes mostrados son sin IVA. Isaak te avisa antes de renovar.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <CreditCard className="h-4 w-4" />
              Base mensual
            </div>
            <ul className="mt-2 list-disc pl-6 text-sm text-slate-600">
              <li>Incluye hasta 10 facturas emitidas al mes.</li>
              <li>Conciliación bancaria opcional: 0 movimientos sin coste.</li>
              <li>Calculadora hasta 1.000 facturas y 2.000 movimientos.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <FileText className="h-4 w-4" />
              Medición de uso
            </div>
            <ul className="mt-2 list-disc pl-6 text-sm text-slate-600">
              <li>Facturas emitidas en el mes.</li>
              <li>Movimientos importados/sincronizados.</li>
              <li>Excel cuenta como registros procesados.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Info className="h-4 w-4" />
              Precio final
            </div>
            <p className="mt-2 text-sm text-slate-600">
              La calculadora muestra un estimado. Ajustamos por uso real y avisamos antes de cobrar.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">Facturas</div>
            <ul className="mt-2 space-y-1">
              <li>1-10 incluido</li>
              <li>11-20 +5 EUR</li>
              <li>21-30 +10 EUR</li>
              <li>31-40 +15 EUR</li>
              <li>41-50 +20 EUR</li>
              <li>51-100 +25 EUR</li>
              <li>101-200 +35 EUR</li>
              <li>201-300 +45 EUR</li>
              <li>301-400 +55 EUR</li>
              <li>401-500 +65 EUR</li>
              <li>501-1000 +85 EUR</li>
              <li>&gt;1000 presupuesto</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">Movimientos</div>
            <ul className="mt-2 space-y-1">
              <li>0 incluido</li>
              <li>1-20 +5 EUR</li>
              <li>21-30 +10 EUR</li>
              <li>31-40 +15 EUR</li>
              <li>41-50 +20 EUR</li>
              <li>51-100 +25 EUR</li>
              <li>101-200 +35 EUR</li>
              <li>201-300 +45 EUR</li>
              <li>301-400 +55 EUR</li>
              <li>401-500 +65 EUR</li>
              <li>501-1000 +85 EUR</li>
              <li>1001-2000 +105 EUR</li>
              <li>&gt;2000 presupuesto</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[#2361d8]/15 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <Info className="h-4 w-4" />
            Ejemplos reales
          </div>
          <ul className="mt-2 list-disc pl-6 text-sm text-slate-600">
            <li>Autonomo: 15 facturas / sin conciliacion = 19 + 5 = 24 EUR.</li>
            <li>PYME: 120 facturas + 300 movimientos = 19 + 35 + 45 = 99 EUR.</li>
          </ul>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
            <MessageCircle className="h-4 w-4" />
            Limites y presupuestos
          </div>
          <p className="mt-2 text-sm text-slate-600">
              Si superas los límites de la calculadora, te ofrecemos presupuesto con integraciones y SLA.{" "}
            <Link href="/recursos/contacto" className="font-semibold text-[#2361d8] underline underline-offset-4">
              Contáctanos
            </Link>{" "}
            para una propuesta personalizada.
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/#planes"
            className="inline-flex items-center justify-center rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
          >
            Calcular precio
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
          >
            Probar con Isaak
          </Link>
        </div>
      </section>
    </main>
  );
}

