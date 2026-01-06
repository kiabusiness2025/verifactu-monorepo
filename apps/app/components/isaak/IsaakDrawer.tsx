"use client";

import React, { useEffect, useRef } from "react";
import { useIsaakUI } from "@/context/IsaakUIContext";
import { useIsaakContext } from "@/hooks/useIsaakContext";

export function IsaakDrawer() {
  const { company, isDrawerOpen, closeDrawer } = useIsaakUI();
  const { title, suggestions } = useIsaakContext();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDrawerOpen) inputRef.current?.focus();
  }, [isDrawerOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeDrawer]);

  const chips = suggestions.slice(0, 3);
  const messages = [
    { from: "Isaak", text: "He preparado tu resumen de facturas del mes. ¿Lo envío al asesor?" },
    { from: "Tú", text: "Revisa si hay incidencias en VeriFactu." },
    { from: "Isaak", text: "Todo ok. Numeración y firma verificadas." },
  ];

  return (
    <>
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-40 h-full w-full max-w-md transform border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Isaak drawer"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Isaak</p>
            <p className="text-xs text-slate-500">
              {title} · {company}
            </p>
          </div>
          <button
            onClick={closeDrawer}
            className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>

        <div className="flex h-[calc(100%-140px)] flex-col gap-3 overflow-y-auto px-5 py-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                m.from === "Isaak"
                  ? "self-start bg-slate-50 text-slate-700"
                  : "self-end bg-blue-600 text-white"
              }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] opacity-70">
                {m.from}
              </span>
              <span className="block mt-1">{m.text}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 px-5 py-4">
          <div className="flex flex-wrap gap-2 pb-3">
            {chips.map((c) => (
              <span
                key={c.label}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
              >
                {c.label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <input
              ref={inputRef}
              type="text"
              placeholder="Escribe o pega una instrucción"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            <button className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
              Enviar
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
