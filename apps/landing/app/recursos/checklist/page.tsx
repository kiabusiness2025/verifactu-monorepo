import Link from "next/link";

export const metadata = {
  title: "Checklist | Verifactu Business",
  description: "Checklist de cumplimiento VeriFactu y control operativo antes de emitir.",
};

const checklist = [
  "Datos fiscales completos y actualizados",
  "Numeracion correlativa sin saltos",
  "Series configuradas por tipo de factura",
  "Politica de abonos definida",
  "Integracion bancaria conectada",
  "Alertas de inconsistencias activas",
  "Exportacion de evidencias programada",
];

export default function ChecklistPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-600">Recursos</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Checklist VeriFactu</h1>
        <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
          Una lista corta para asegurar que tu facturacion esta lista antes de emitir.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ul className="space-y-3 text-sm text-slate-700">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">Quieres la version imprimible?</div>
          <div className="flex gap-3">
            <button className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              Descargar PDF
            </button>
            <Link
              href="/recursos/guias-y-webinars"
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-200"
            >
              Ver guias
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
