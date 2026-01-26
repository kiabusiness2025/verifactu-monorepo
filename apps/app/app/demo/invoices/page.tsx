"use client";

import { useMemo, useState } from "react";
import { InvoiceQR } from "@/components/invoices/InvoiceQR";
import { DemoLockedButton } from "@/components/demo/DemoLockedButton";
import { getInvoices } from "@/src/lib/data/client";
import { formatCurrency, formatShortDate } from "@/src/lib/formatters";
import type { DemoInvoice } from "@/src/lib/demo/demoData";

const statusStyles: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  pending: "bg-amber-50 text-amber-700 ring-amber-100",
  overdue: "bg-rose-50 text-rose-700 ring-rose-100",
  sent: "bg-blue-50 text-blue-700 ring-blue-100",
};

const statusLabels: Record<string, string> = {
  paid: "Cobrada",
  pending: "Pendiente",
  overdue: "Vencida",
  sent: "Enviada",
};

const verifactuLabels: Record<string, string> = {
  validated: "Validado AEAT",
  pending: "Pendiente",
  error: "Error",
  sent: "Enviado",
};

const verifactuStyles: Record<string, string> = {
  validated: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  pending: "bg-amber-50 text-amber-700 ring-amber-100",
  error: "bg-rose-50 text-rose-700 ring-rose-100",
  sent: "bg-blue-50 text-blue-700 ring-blue-100",
};

export default function DemoInvoicesPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<DemoInvoice | null>(null);
  const invoices = getInvoices("demo");
  const recentInvoices = useMemo(() => invoices.slice(0, 18), [invoices]);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">Facturas demo</h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Solo lectura
            </span>
          </div>
          <DemoLockedButton
            className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
            toastMessage="Disponible al activar tu prueba"
          >
            + Nueva factura
          </DemoLockedButton>
        </div>
        <p className="text-xs text-slate-500">
          Esta tabla es una muestra de facturas emitidas para Empresa Demo SL.
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Numero</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-right">Importe</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-center">VeriFactu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{inv.number}</td>
                  <td className="px-4 py-3 text-slate-600">{formatShortDate(inv.issueDate)}</td>
                  <td className="px-4 py-3 text-slate-900">{inv.customerName}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(inv.amountGross)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ${
                        statusStyles[inv.status] ??
                        "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}
                    >
                      {statusLabels[inv.status] ?? "Pendiente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {inv.verifactuStatus ? (
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${
                            verifactuStyles[inv.verifactuStatus] ??
                            "bg-slate-100 text-slate-600 ring-slate-200"
                          }`}
                        >
                          {verifactuLabels[inv.verifactuStatus] ?? "Pendiente"}
                        </span>
                        {(inv.verifactuQr || inv.verifactuHash) && (
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Ver QR
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Sin validar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">
                Factura {selectedInvoice.number}
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <InvoiceQR invoice={selectedInvoice} />
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Este QR es un ejemplo de trazabilidad VeriFactu en modo demo.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
