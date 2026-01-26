"use client";

import { DemoLockedButton } from "@/components/demo/DemoLockedButton";
import { getBankMovements } from "@/src/lib/data/client";
import { formatCurrency, formatShortDate } from "@/src/lib/formatters";

export default function DemoBanksPage() {
  const movements = getBankMovements("demo");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">Bancos demo</h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Solo lectura
            </span>
          </div>
          <DemoLockedButton
            className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
            toastMessage="Disponible al activar tu prueba"
          >
            Conectar banco
          </DemoLockedButton>
        </div>
        <p className="text-xs text-slate-500">
          Movimientos simulados para mostrar conciliacion automatica.
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3 text-right">Importe</th>
                <th className="px-4 py-3 text-center">Conciliado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {formatShortDate(movement.date)}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{movement.concept}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(movement.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ${
                        movement.reconciled
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          : "bg-amber-50 text-amber-700 ring-amber-100"
                      }`}
                    >
                      {movement.reconciled ? "Conciliado" : "Pendiente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
