"use client";

import { useMemo, useState } from "react";

export default function IsaakCommandInput() {
  const [value, setValue] = useState("");

  const suggestions = useMemo(
    () => [
      "Emitir factura",
      "Añadir gasto",
      "Ver plazos",
      "Revisar beneficio",
    ],
    []
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Isaak
          </p>
          <h2 className="mt-1 text-sm font-semibold text-slate-900">
            ¿Qué necesitas?
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Tú pide. Yo te lo dejo listo.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ej.: emitir factura"
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setValue(s)}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        “Solo ves ventas − gastos = beneficio. Yo me encargo del resto.”
      </div>
    </section>
  );
}
