"use client";

import { useMemo } from "react";
import { DemoLockedButton } from "@/components/demo/DemoLockedButton";
import { getCustomers, getInvoices } from "@/src/lib/data/client";
import { formatCurrency, formatShortDate } from "@/src/lib/formatters";

export default function DemoClientsPage() {
  const customers = getCustomers("demo");
  const invoices = getInvoices("demo");

  const rows = useMemo(() => {
    return customers.map((customer) => {
      const customerInvoices = invoices.filter(
        (inv) => inv.customerName === customer.name
      );
      const lastInvoice = customerInvoices[0];
      const total = customerInvoices.reduce((sum, inv) => sum + inv.amountGross, 0);
      return {
        ...customer,
        total,
        count: customerInvoices.length,
        lastInvoiceDate: lastInvoice?.issueDate ?? null,
      };
    });
  }, [customers, invoices]);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">Clientes demo</h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Solo lectura
            </span>
          </div>
          <DemoLockedButton
            className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
            toastMessage="Disponible al activar tu prueba"
          >
            + Nuevo cliente
          </DemoLockedButton>
        </div>
        <p className="text-xs text-slate-500">
          Clientes simulados para la Empresa Demo SL. Todo es solo lectura.
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">NIF</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Facturacion</th>
                <th className="px-4 py-3 text-right">Facturas</th>
                <th className="px-4 py-3">Ultima factura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.nif}</td>
                  <td className="px-4 py-3 text-slate-600">{row.email ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(row.total)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{row.count}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.lastInvoiceDate ? formatShortDate(row.lastInvoiceDate) : "-"}
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
