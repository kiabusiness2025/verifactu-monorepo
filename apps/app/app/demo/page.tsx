"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getAppUrl, getLandingUrl } from "@/lib/urls";
import { demoData } from "@/src/lib/demo/demoData";
import { IsaakUIProvider } from "@/context/IsaakUIContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { QuickActions } from "@/components/dashboard/QuickActions";

export default function DemoPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const appUrl = getAppUrl();
  const landingUrl = getLandingUrl();
  const loginUrl = `${landingUrl}/auth/login?next=${encodeURIComponent(`${appUrl}/dashboard`)}`;

  const recentInvoices = useMemo(() => demoData.invoices.slice(0, 12), []);

  return (
    <IsaakUIProvider>
      <div className="app-shell flex min-h-screen bg-slate-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isDemo />
        <div className="flex min-h-screen w-full flex-col lg:pl-72">
          <Topbar
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            isDemo
            demoCompanyName={demoData.tenant.name}
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
                  <div>La demo es solo lectura.</div>
                </div>
                <a
                  href={loginUrl}
                  className="inline-flex items-center gap-2 font-semibold text-amber-900 hover:text-amber-700"
                >
                  Probar con mis datos
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Resumen demo
                </h2>
                <span className="rounded-full bg-[#0b6cfb]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0b6cfb]">
                  Datos simulados
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Modo demo: estas cifras son simuladas y no se pueden modificar.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Ventas mes</p>
                  <p className="mt-2 text-2xl font-semibold text-[#0b214a]">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    }).format(demoData.kpis.revenueMonth)}
                  </p>
                  <p className="mt-1 text-xs text-emerald-600">
                    {demoData.kpis.invoicesCount} facturas recientes
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Gastos mes</p>
                  <p className="mt-2 text-2xl font-semibold text-[#0b214a]">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    }).format(demoData.kpis.expensesMonth)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Estimado por ratio historico</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Beneficio</p>
                  <p className="mt-2 text-2xl font-semibold text-[#0b214a]">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    }).format(demoData.kpis.profitMonth)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Actualizado hoy</p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm ring-1 ring-blue-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">IVA estimado</p>
                  <p className="mt-2 text-2xl font-semibold text-blue-900">
                    {new Intl.NumberFormat("es-ES", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    }).format(demoData.kpis.vatEstimated)}
                  </p>
                  <p className="mt-1 text-xs text-blue-600">Segun facturas del periodo</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Acciones
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Solo lectura
                </span>
              </div>
              <p className="text-xs text-slate-500">
                En demo no puedes emitir facturas, conectar bancos ni editar datos.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-400"
                >
                  Emitir factura
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-400"
                >
                  Conectar banco
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-400"
                >
                  Enviar a AEAT
                </button>
              </div>
              <QuickActions isDemo />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Facturas recientes
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Solo lectura
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Historial de ejemplo. No se pueden editar ni emitir nuevas facturas.
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{inv.number}</td>
                        <td className="px-4 py-3 text-slate-600">{inv.issueDate}</td>
                        <td className="px-4 py-3 text-slate-900">{inv.customerName}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {new Intl.NumberFormat("es-ES", {
                            style: "currency",
                            currency: "EUR",
                            maximumFractionDigits: 0,
                          }).format(inv.amountGross)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={[
                              "rounded-full px-2 py-1 text-xs font-semibold",
                              inv.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                                : inv.status === "overdue"
                                  ? "bg-red-50 text-red-700 ring-1 ring-red-100"
                                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
                            ].join(" ")}
                          >
                            {inv.status === "paid"
                              ? "Cobrada"
                              : inv.status === "overdue"
                                ? "Vencida"
                                : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Isaak en accion
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Ejemplos
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Respuestas de muestra para ver como te guiaria Isaak.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {demoData.isaakExamples.map((item) => (
                  <div key={item.prompt} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Pregunta
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{item.prompt}</p>
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Respuesta
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="text-sm font-semibold text-slate-800">
                Probar con tus datos reales y activar 1 mes gratis.
              </div>
              <a
                href={loginUrl}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
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
