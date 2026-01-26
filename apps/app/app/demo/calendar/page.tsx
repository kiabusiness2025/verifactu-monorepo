"use client";

import { DemoLockedButton } from "@/components/demo/DemoLockedButton";
import { getCalendar } from "@/src/lib/data/client";
import { formatShortDate } from "@/src/lib/formatters";

export default function DemoCalendarPage() {
  const items = getCalendar("demo");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">Calendario demo</h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Solo lectura
            </span>
          </div>
          <DemoLockedButton
            className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
            toastMessage="Disponible al activar tu prueba"
          >
            Nuevo evento
          </DemoLockedButton>
        </div>
        <p className="text-xs text-slate-500">
          Plazos fiscales simulados para que veas como se organiza Isaak.
        </p>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">
                  {formatShortDate(item.date)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                    item.status === "due"
                      ? "bg-rose-50 text-rose-700 ring-rose-100"
                      : item.status === "soon"
                        ? "bg-amber-50 text-amber-700 ring-amber-100"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  }`}
                >
                  {item.statusLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
