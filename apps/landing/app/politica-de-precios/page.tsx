import type { Metadata } from "next";

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
          La calculadora cubre hasta <strong>500 facturas/mes</strong> y <strong>1000 movimientos/mes</strong>. Por encima
          de esos limites, ofrecemos presupuesto personalizado e integraciones avanzadas.
        </li>
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

      <h2 className="mt-10 text-xl font-semibold">Cambios y cancelacion</h2>
      <p className="mt-3 text-gray-700">
        Podemos ajustar tramos o importes para reflejar costes e incorporar mejoras. Si hay cambios, se comunicaran con
        antelacion razonable. Puedes cancelar en cualquier momento segun las condiciones de tu suscripcion.
      </p>
    </main>
  );
}
