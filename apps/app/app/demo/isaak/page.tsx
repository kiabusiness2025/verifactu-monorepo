"use client";

import { DemoLockedButton } from "@/components/demo/DemoLockedButton";
import { getIsaakCards } from "@/src/lib/data/client";

export default function DemoIsaakPage() {
  const cards = getIsaakCards("demo");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">Isaak AI demo</h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Solo lectura
            </span>
          </div>
          <DemoLockedButton
            className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400"
            toastMessage="Disponible al activar tu prueba"
          >
            Nuevo chat
          </DemoLockedButton>
        </div>
        <p className="text-xs text-slate-500">
          Isaak propone tareas y respuestas con datos simulados.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {card.title}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                    card.tone === "ok"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : card.tone === "warn"
                        ? "bg-amber-50 text-amber-700 ring-amber-100"
                        : "bg-blue-50 text-blue-700 ring-blue-100"
                  }`}
                >
                  {card.badge}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{card.message}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.response}</p>
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-700">
                {card.footer}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
