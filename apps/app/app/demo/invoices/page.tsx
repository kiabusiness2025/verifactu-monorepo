"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getAppUrl, getLandingUrl } from "@/lib/urls";
import { IsaakUIProvider } from "@/context/IsaakUIContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { InvoiceQR } from "@/components/invoices/InvoiceQR";
import { getInvoices, getTenant } from "@/src/lib/data/client";
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

export default function DemoInvoicesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<DemoInvoice | null>(null);
  const appUrl = getAppUrl();
  const landingUrl = getLandingUrl();
  const loginUrl = `${landingUrl}/auth/login?next=${encodeURIComponent(`${appUrl}/onboarding`)}`;
  const backUrl = landingUrl;

  const tenant = getTenant("demo");
  const invoices = getInvoices("demo");
  const recentInvoices = useMemo(() => invoices.slice(0, 18), [invoices]);

  return (
    <IsaakUIProvider>
      <div className="app-shell flex min-h-screen bg-slate-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isDemo />
        <div className="flex min-h-screen w-full flex-col lg:pl-72">
          <Topbar
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            isDemo
            demoCompanyName={tenant?.name ?? "Empresa Demo SL"}
          />

          <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 pb-20 sm:px-6 sm:py-8">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Modo demo
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                      Datos simulados
                    </span>
                  </div>
                  <div>Estas viendo facturas de ejemplo. Todo es solo lectura.</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={backUrl}
                    className="inline-flex items-center gap-2 font-semibold text-amber-900 hover:text-amber-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio
                  </a>
                  <a
                    href={loginUrl}
                    className="inline-flex items-center gap-2 font-semibold text-amber-900 hover:text-amber-700"
                  >
                    Probar con mis datos (1 mes gratis)
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-slate-900">Facturas demo</h1>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    Solo lectura
                  </span>
                </div>
                <button
                  type="button"
                  disabled
                  className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
                >
                  + Nueva factura
                </button>
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
                              statusStyles[inv.status] ?? "bg-slate-100 text-slate-600 ring-slate-200"
                            }`}
                          >
                            {statusLabels[inv.status] ?? "Pendiente"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {inv.verifactuStatus ? (
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(inv)}
                              className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              Ver QR
                            </button>
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
                  onClick={(e) => e.stopPropagation()}
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
                  <div className="mt-4">
                    <InvoiceQR invoice={selectedInvoice} />
                  </div>
                </div>
              </div>
            )}
          </main>

          <div className="fixed inset-x-0 bottom-4 z-30 px-4">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
              <div className="text-sm font-semibold text-[#0b214a]">
                Estas en demo. Listo para usar tu propia empresa?
              </div>
              <a
                href={loginUrl}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#0060F0] to-[#20B0F0] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-[#0056D6] hover:to-[#1AA3DB]"
              >
                Probar con mis datos (1 mes gratis)
              </a>
            </div>
          </div>
        </div>
      </div>
    </IsaakUIProvider>
  );
}
