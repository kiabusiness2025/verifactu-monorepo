import { Calculator, CreditCard, FileText, Info, MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de precios | verifactu.business',
  description:
    'Cómo se calcula el precio, qué se incluye en la cuota y cómo medimos el uso en verifactu.business.',
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
          Tu cuota mensual parte del plan que elijas (Básico, PYME, Empresa o Pro). Si superas
          facturas incluidas, se aplica exceso por tramos. Los importes son sin IVA.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <CreditCard className="h-4 w-4" />
              Base mensual
            </div>
            <ul className="mt-2 list-disc pl-6 text-sm text-slate-600">
              <li>Incluye hasta 10 facturas emitidas al mes.</li>
              <li>Planes fijos: 19 / 39 / 69 / 99 EUR al mes.</li>
              <li>Calculadora de exceso para facturas adicionales.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <FileText className="h-4 w-4" />
              Medición de uso
            </div>
            <ul className="mt-2 list-disc pl-6 text-sm text-slate-600">
              <li>Facturas emitidas en el mes.</li>
              <li>Facturas incluidas según plan.</li>
              <li>Exceso por tramos en la siguiente factura.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2361d8]">
              <Info className="h-4 w-4" />
              Precio final
            </div>
            <p className="mt-2 text-sm text-slate-600">
              La calculadora muestra un estimado del exceso. Te avisamos antes de cobrar.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-500">Planes</div>
          <ul className="mt-2 space-y-1">
            <li>Básico: 19 EUR/mes (hasta 10 facturas)</li>
            <li>PYME: 39 EUR/mes (hasta 100 facturas)</li>
            <li>Empresa: 69 EUR/mes (hasta 300 facturas)</li>
            <li>Pro: 99 EUR/mes (hasta 1.000 facturas)</li>
          </ul>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">Facturas</div>
            <ul className="mt-2 space-y-1">
              <li>Exceso 1-25: 0,50 EUR por factura</li>
              <li>Exceso 26-100: 0,35 EUR por factura</li>
              <li>Exceso 101-500: 0,20 EUR por factura</li>
              <li>Exceso 501+: 0,12 EUR por factura</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">Trial</div>
            <ul className="mt-2 space-y-1">
              <li>Acceso automático a Empresa Demo SL sin caducidad</li>
              <li>Prueba real de 30 días para crear 1 empresa con tus datos</li>
              <li>Aviso previo antes del primer cobro</li>
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
            Si superas los límites de la calculadora, te ofrecemos presupuesto con integraciones y
            SLA.{' '}
            <Link
              href="/recursos/contacto"
              className="font-semibold text-[#2361d8] underline underline-offset-4"
            >
              Contáctanos
            </Link>{' '}
            para una propuesta personalizada.
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/precios"
            className="inline-flex items-center justify-center rounded-xl bg-[#2361d8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1f55c0]"
          >
            Ver planes y comparativa
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-xl border border-[#2361d8] px-6 py-3 text-sm font-semibold text-[#2361d8] hover:bg-[#2361d8]/10"
          >
            Crear cuenta y entrar en Demo SL
          </Link>
        </div>
      </section>
    </main>
  );
}
