"use client";

import { useMemo, useState } from "react";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import {
  getInvoices,
  getIsaakExamples,
  getPnl,
} from "@/src/lib/data/client";
import { formatCurrency, formatPercent, formatShortDate } from "@/src/lib/formatters";

export default function DemoPage() {
  const [activeExample, setActiveExample] = useState(0);
  const invoices = getInvoices("demo");
  const pnl = getPnl("demo");
  const isaakExamples = getIsaakExamples("demo");
  const recentInvoices = useMemo(() => invoices.slice(0, 12), [invoices]);

  return (
    <div className="space-y-6">
      <DashboardHome />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Acciones bloqueadas
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Solo lectura
          </span>
        </div>
        <p className="text-xs text-slate-500">
          En demo no puedes emitir facturas, conectar bancos ni enviar datos reales.
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
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Mini PyG
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            Datos simulados
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Resumen sintetico de ventas, gastos y beneficio estimado.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Ventas</p>
            <p className="mt-2 text-xl font-semibold text-[#0b214a]">
              {formatCurrency(pnl?.revenue ?? 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{pnl?.periodLabel ?? "Periodo actual"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Gastos</p>
            <p className="mt-2 text-xl font-semibold text-[#0b214a]">
              {formatCurrency(pnl?.expenses ?? 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Operativos + recurrentes</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Beneficio</p>
            <p className="mt-2 text-xl font-semibold text-[#0b214a]">
              {formatCurrency(pnl?.profit ?? 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Margen {pnl ? formatPercent(pnl.margin) : "0,00"}%
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm ring-1 ring-blue-100">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">IVA estimado</p>
            <p className="mt-2 text-xl font-semibold text-blue-900">
              {formatCurrency(pnl?.vatEstimated ?? 0)}
            </p>
            <p className="mt-1 text-xs text-blue-600">Segun facturas del periodo</p>
          </div>
        </div>
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
                  <td className="px-4 py-3 text-slate-600">
                    {formatShortDate(inv.issueDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{inv.customerName}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(inv.amountGross)}
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
        <div className="grid gap-4 lg:grid-cols-[1.15fr,1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Preguntas frecuentes en demo
            </div>
            <div className="mt-3 space-y-2">
              {isaakExamples.map((item, idx) => {
                const isActive = idx === activeExample;
                return (
                  <button
                    key={`${item.prompt}-${idx}`}
                    type="button"
                    onClick={() => setActiveExample(idx)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "border-[#0b6cfb] bg-[#0b6cfb]/10 text-[#0b6cfb]"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.prompt}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Respuesta de Isaak
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              {isaakExamples[activeExample]?.prompt}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isaakExamples[activeExample]?.answer}
            </p>
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-700">
              Modo demo: respuestas simuladas. En tu cuenta, Isaak usara tus datos reales.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
