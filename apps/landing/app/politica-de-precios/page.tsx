import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politica de precios | Verifactu Business",
  description:
    "Como se calcula el precio, que se incluye en la cuota y como medimos el uso en Verifactu Business.",
};

export default function PoliticaDePreciosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">Politica de precios y medicion de uso</h1>
      <p className="mt-6 text-gray-700">
        Tu cuota mensual se compone de base y tramos de uso (facturas y, si activas conciliacion, movimientos
        bancarios). Los importes mostrados son sin IVA.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Base mensual</h2>
      <ul className="mt-3 list-disc pl-6 text-gray-700">
        <li>
          Incluye hasta <strong>10 facturas emitidas al mes</strong>.
        </li>
        <li>
          Conciliacion bancaria opcional: <strong>0 movimientos</strong> no tiene coste; si procesas movimientos se aplica
          un tramo.
        </li>
        <li>
          La calculadora cubre hasta <strong>1.000 facturas/mes</strong> y <strong>2.000 movimientos/mes</strong>. Por
          encima de esos limites, ofrecemos presupuesto personalizado e integraciones avanzadas.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Tramos completos</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
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

      <h2 className="mt-10 text-xl font-semibold">Ejemplos reales</h2>
      <ul className="mt-3 list-disc pl-6 text-gray-700">
        <li>Autonomo: 15 facturas / sin conciliacion = 19 + 5 = 24 EUR.</li>
        <li>PYME: 120 facturas + 300 movimientos = 19 + 35 + 45 = 99 EUR.</li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Precio estimado vs precio final</h2>
      <p className="mt-3 text-gray-700">
        La calculadora muestra un precio estimado. Durante la prueba gratuita y/o el mes en curso podemos medir tu uso
        real (facturas emitidas y movimientos procesados) para ajustar el tramo. Te avisaremos del importe antes de
        cobrar.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Como medimos el uso</h2>
      <ul className="mt-3 list-disc pl-6 text-gray-700">
        <li>
          <strong>Facturas emitidas</strong>: numero de facturas generadas/emitidas en el mes.
        </li>
        <li>
          <strong>Movimientos bancarios</strong>: numero de movimientos importados/sincronizados y procesados para
          conciliacion.
        </li>
        <li>
          Si importas mediante Excel, se calcula igualmente por el numero de registros procesados.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Que pasa si supero limites</h2>
      <p className="mt-3 text-gray-700">
        Si superas los limites de la calculadora, te ofrecemos presupuesto con integraciones y SLA.{" "}
        <Link href="/recursos/contacto" className="font-semibold text-[#0060F0] hover:text-[#0080F0]">
          Contactanos
        </Link>{" "}
        para una propuesta personalizada.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Cambios y cancelacion</h2>
      <p className="mt-3 text-gray-700">
        Podemos ajustar tramos o importes para reflejar costes e incorporar mejoras. Si hay cambios, se comunicaran con
        antelacion razonable. Puedes cancelar en cualquier momento segun las condiciones de tu suscripcion.
      </p>
    </main>
  );
}
