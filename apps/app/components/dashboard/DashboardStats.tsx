"use client";

import React from "react";
import { FileText, Receipt, FolderUp } from "lucide-react";

type Stat = {
  title: string;
  value: string;
  note?: string;
  tone?: "ok" | "warn" | "info";
};

const toneClasses: Record<NonNullable<Stat["tone"]>, string> = {
  ok: "text-emerald-700 bg-emerald-50 ring-emerald-200",
  warn: "text-amber-700 bg-amber-50 ring-amber-200",
  info: "text-[#0b6cfb] bg-[#0b6cfb]/10 ring-[#0b6cfb]/25",
};

export function DashboardStats() {
  // TODO: Obtener stats reales desde API
  const stats: Stat[] = [];

  if (stats.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0b214a]">
              Activa tus metricas en 3 pasos
            </p>
            <p className="text-xs text-slate-500">
              Tu panel se llena automaticamente cuando empieces a operar.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ff8a3d]/10 px-3 py-1 text-xs font-semibold text-[#b94b00]">
            Primeros pasos
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0b6cfb]/10 text-[#0b6cfb]">
              <FileText className="h-4 w-4" />
            </span>
            <span>1. Crea tu primera factura</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Receipt className="h-4 w-4" />
            </span>
            <span>2. Registra un gasto recurrente</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <FolderUp className="h-4 w-4" />
            </span>
            <span>3. Sube un documento fiscal</span>
          </div>
        </div>
      </div>
    );
  }

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
            <span className="text-2xl font-semibold text-[#0b214a]">
              {stat.value}
            </span>
            {stat.tone && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                  toneClasses[stat.tone]
                }`}
              >
                {stat.tone === "ok"
                  ? "Listo"
                  : stat.tone === "warn"
                  ? "Revisar"
                  : "Info"}
              </span>
            )}
          </div>
          {stat.note && <p className="mt-1 text-xs text-slate-500">{stat.note}</p>}
        </div>
      ))}
    </div>
  );
}
