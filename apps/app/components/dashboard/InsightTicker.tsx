"use client";

import React, { useEffect, useMemo, useState } from "react";

type Insight = {
  category: "¿Sabías que…?" | "Consejo de Isaak" | "Recordatorio";
  text: string;
};

const badgeStyles: Record<Insight["category"], string> = {
  "¿Sabías que…?": "bg-blue-50 text-blue-700 ring-blue-200",
  "Consejo de Isaak": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Recordatorio": "bg-amber-50 text-amber-700 ring-amber-200",
};

export function InsightTicker() {
  const insights: Insight[] = useMemo(
    () => [
      { category: "¿Sabías que…?", text: "Puedes emitir una factura VeriFactu en menos de 2 minutos con ayuda de Isaak." },
      { category: "Consejo de Isaak", text: "Revisa vencimientos cada viernes para evitar cargos de financiación." },
      { category: "Recordatorio", text: "Sube tickets el mismo día para mejorar deducibilidad." },
      { category: "¿Sabías que…?", text: "Las incidencias se resuelven antes de enviar si revisas borradores." },
      { category: "Consejo de Isaak", text: "Etiqueta gastos con proyectos para ver margen real por línea." },
      { category: "Recordatorio", text: "Comprueba el acceso antes del día 1 para evitar bloqueos." },
      { category: "¿Sabías que…?", text: "Puedes compartir un enlace con tu asesor sin descargar." },
      { category: "Consejo de Isaak", text: "Programa recordatorios de cobro 48h antes del vencimiento." },
      { category: "Recordatorio", text: "Mantén la numeración ordenada para cumplir VeriFactu." },
    ],
    []
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((prev) => (prev + 1) % insights.length), 8000);
    return () => clearInterval(id);
  }, [insights.length]);

  const current = insights[index];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${badgeStyles[current.category]}`}
      >
        {current.category}
      </span>
      <p className="mt-3 text-sm leading-6 text-slate-700">{current.text}</p>
    </div>
  );
}
