"use client";

import React from "react";
import { Button } from "@verifactu/ui";
import { useIsaakUI } from "@/context/IsaakUIContext";

type Action = {
  label: string;
  description: string;
  onClick: () => void;
};

export function QuickActions() {
  const { openDrawer } = useIsaakUI();

  const actions: Action[] = [
    { label: "Crear factura", description: "VeriFactu al día", onClick: () => {} },
    { label: "Subir documento", description: "Ordenado y listo", onClick: () => {} },
    { label: "Preguntar a Isaak", description: "Respuestas guiadas", onClick: openDrawer },
    { label: "Ver resumen", description: "Ventas, gastos, beneficio", onClick: () => {} },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <div
          key={action.label}
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{action.label}</p>
              <p className="text-xs text-slate-500">{action.description}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full justify-center rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            onClick={action.onClick}
          >
            Ir
          </Button>
        </div>
      ))}
    </div>
  );
}
