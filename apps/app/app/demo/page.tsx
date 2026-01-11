"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";

const DEMO_DATA = {
  revenue: 47250,
  expensesTotal: 12800,
  profit: 34450,
  invoices: [
    { id: "F-2026-001", date: "2026-01-05", client: "Acme Corp", amount: 12500, status: "paid" },
    { id: "F-2026-002", date: "2026-01-07", client: "TechStart SL", amount: 8400, status: "pending" },
    { id: "F-2026-003", date: "2026-01-08", client: "Design Studio", amount: 5600, status: "paid" },
  ],
  expenses: [
    { id: "G-001", date: "2026-01-03", concept: "Hosting AWS", amount: 450, category: "Servicios" },
    { id: "G-002", date: "2026-01-04", concept: "Software licencias", amount: 890, category: "Tecnología" },
    { id: "G-003", date: "2026-01-06", concept: "Material oficina", amount: 120, category: "Suministros" },
  ],
};

const ISAAK_MESSAGES = [
  "He revisado tus últimas 3 facturas. Todo parece correcto y conforme a VeriFactu.",
  "Detecté que tienes 2 gastos pendientes de clasificar. ¿Los reviso contigo?",
  "Tu beneficio actual es de 34.450€. Un 12% más que el mes anterior.",
  "Recuerda: tienes una factura pendiente de cobro desde hace 3 días.",
];

export default function DemoPage() {
  const [isaakOpen, setIsaakOpen] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  const currentMessage = ISAAK_MESSAGES[msgIndex];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
              V
            </div>
            <span className="font-semibold text-slate-900">Verifactu Business</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              DEMO
            </span>
            <button
              onClick={() => setIsaakOpen(!isaakOpen)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <MessageCircle className="h-4 w-4" />
              {isaakOpen ? "Cerrar" : "Isaak"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ventas</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
                DEMO_DATA.revenue
              )}
            </div>
            <div className="mt-1 text-xs text-emerald-600">+12% vs mes anterior</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gastos</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
                DEMO_DATA.expensesTotal
              )}
            </div>
            <div className="mt-1 text-xs text-slate-600">Normal para este periodo</div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm ring-1 ring-blue-100">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">Beneficio</div>
            <div className="mt-2 text-2xl font-bold text-blue-900">
              {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
                DEMO_DATA.profit
              )}
            </div>
            <div className="mt-1 text-xs text-blue-600">Margen del 73%</div>
          </div>
        </div>

        {/* Invoices */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Facturas recientes</h2>
            <button className="text-sm font-semibold text-blue-700 hover:text-blue-800">Ver todas</button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DEMO_DATA.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{inv.id}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.date}</td>
                    <td className="px-4 py-3 text-slate-900">{inv.client}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {new Intl.NumberFormat("es-ES", {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      }).format(inv.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "rounded-full px-2 py-1 text-xs font-semibold",
                          inv.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                            : "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
                        ].join(" ")}
                      >
                        {inv.status === "paid" ? "Cobrada" : "Pendiente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Expenses */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Gastos recientes</h2>
            <button className="text-sm font-semibold text-blue-700 hover:text-blue-800">Ver todos</button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {DEMO_DATA.expenses.map((exp) => (
              <div key={exp.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{exp.category}</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">{exp.concept}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {new Intl.NumberFormat("es-ES", {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      }).format(exp.amount)}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{exp.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Isaak Panel */}
      {isaakOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-200 bg-white shadow-2xl sm:w-96">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 font-bold">
                  I
                </div>
                <div>
                  <div className="font-semibold text-white">Isaak</div>
                  <div className="text-xs text-blue-100">Tu asistente fiscal</div>
                </div>
              </div>
              <button
                onClick={() => setIsaakOpen(false)}
                className="rounded-lg p-2 text-white hover:bg-blue-800"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div className="rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100">
                  <div className="text-sm leading-6 text-slate-900">{currentMessage}</div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setMsgIndex((i) => (i + 1) % ISAAK_MESSAGES.length)}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50"
                    >
                      Siguiente consejo
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Vista rápida</div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    <li>• 3 facturas emitidas este mes</li>
                    <li>• 1 factura pendiente de cobro</li>
                    <li>• 3 gastos clasificados</li>
                    <li>• 0 alertas de cumplimiento</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
