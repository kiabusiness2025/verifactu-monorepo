"use client";

import React from "react";

type Stat = {
  title: string;
  value: string;
  note?: string;
  tone?: "ok" | "warn" | "info";
};

const toneClasses: Record<NonNullable<Stat["tone"]>, string> = {
  ok: "text-emerald-700 bg-emerald-50 ring-emerald-200",
  warn: "text-amber-700 bg-amber-50 ring-amber-200",
  info: "text-[#0060F0] bg-[#0060F0]/10 ring-[#0060F0]/25",
};

export function DashboardStats() {
  const stats: Stat[] = [
    { title: "Facturas (mes)", value: "28", note: "3 pendientes de enviar", tone: "info" },
    { title: "Estado VeriFactu", value: "Ok", note: "Ultima actualizacion hace 5 min", tone: "ok" },
    { title: "AEAT", value: "Sin avisos", note: "Todo al dia", tone: "ok" },
    { title: "Bancos", value: "Conciliacion 92%", note: "2 movimientos por revisar", tone: "warn" },
    { title: "Documentos", value: "148", note: "Listos para revisar", tone: "info" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {stat.title}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-semibold text-[#002060]">{stat.value}</span>
            {stat.tone && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                  toneClasses[stat.tone]
                }`}
              >
                {stat.tone === "ok" ? "Listo" : stat.tone === "warn" ? "Revisar" : "Info"}
              </span>
            )}
          </div>
          {stat.note && <p className="mt-1 text-xs text-slate-500">{stat.note}</p>}
        </div>
      ))}
    </div>
  );
}
