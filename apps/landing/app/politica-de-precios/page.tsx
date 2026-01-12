import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de precios | Verifactu Business",
  description:
    "Cómo se calcula el precio, qué se incluye en la cuota y cómo medimos el uso en Verifactu Business.",
};

export default function PoliticaDePreciosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">Política de precios y medición de uso</h1>
      <p className="mt-6 text-gray-700">
        Tu cuota mensual se compone de base y tramos de uso (facturas y, si activas conciliación, movimientos
        bancarios). Los importes mostrados son sin IVA.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Base mensual</h2>
      <ul className="mt-3 list-disc pl-6 text-gray-700">
        <li>
          Incluye hasta <strong>10 facturas emitidas al mes</strong>.
        </li>
        <li>
          Conciliación bancaria opcional: <strong>0 movimientos</strong> no tiene coste; si procesas movimientos se aplica
          un tramo.
        </li>
        <li>
          La calculadora cubre hasta <strong>1.000 facturas/mes</strong> y <strong>2.000 movimientos/mes</strong>. Por
          encima de esos límites, ofrecemos presupuesto personalizado e integraciones avanzadas.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Precio estimado vs precio final</h2>
      <p className="mt-3 text-gray-700">
        La calculadora muestra un precio estimado. Durante la prueba gratuita y/o el mes en curso podemos medir tu uso
        real (facturas emitidas y movimientos procesados) para ajustar el tramo. Te avisaremos del importe antes de
        cobrar.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Cómo medimos el uso</h2>
      <ul className="mt-3 list-disc pl-6 text-gray-700">
        <li>
          <strong>Facturas emitidas</strong>: número de facturas generadas/emitidas en el mes.
        </li>
        <li>
          <strong>Movimientos bancarios</strong>: número de movimientos importados/sincronizados y procesados para
          conciliación.
        </li>
        <li>
          Si importas mediante Excel, se calcula igualmente por el número de registros procesados.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Cambios y cancelación</h2>
      <p className="mt-3 text-gray-700">
        Podemos ajustar tramos o importes para reflejar costes e incorporar mejoras. Si hay cambios, se comunicarán con
        antelación razonable. Puedes cancelar en cualquier momento según las condiciones de tu suscripción.
      </p>
    </main>
  );
}
