"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

type DemoGuidedTourProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

type TourStep = {
  id: string;
  path: string;
  title: string;
  description: string;
  checklist: string[];
  isaakHelp: string;
  suggestedPrompt: string;
};

const ISAAK_PREFILL_KEY = "vf_isaak_prefill_prompt_v1";

const TOUR_STEPS: TourStep[] = [
  {
    id: "overview",
    path: "/demo",
    title: "1. Entiende tu panel en 1 minuto",
    description:
      "Empieza en resumen para ver métricas, riesgos y próximos pasos del negocio de ejemplo.",
    checklist: [
      "Revisar beneficio, IVA estimado y pendientes",
      "Ver acciones clave del día",
      "Abrir sugerencias de Isaak",
    ],
    isaakHelp: "Pídele a Isaak: 'hazme un resumen del día en 3 líneas'.",
    suggestedPrompt: "Hazme un resumen del día en 3 líneas",
  },
  {
    id: "invoices",
    path: "/demo/invoices",
    title: "2. Domina facturas y cobros",
    description:
      "Aprende a leer estado de facturas, trazabilidad VeriFactu y prioridades de cobro.",
    checklist: [
      "Identificar facturas vencidas y pendientes",
      "Revisar estado VeriFactu y QR",
      "Preparar siguiente acción de cobro",
    ],
    isaakHelp: "Pídele a Isaak: 'qué facturas debería cobrar primero y por qué'.",
    suggestedPrompt: "Qué facturas debería cobrar primero y por qué",
  },
  {
    id: "clients",
    path: "/demo/clients",
    title: "3. Prioriza clientes rentables",
    description:
      "Consulta facturación por cliente y detecta dónde conviene hacer seguimiento.",
    checklist: [
      "Ver clientes top por ingresos",
      "Detectar baja actividad reciente",
      "Definir próximo contacto",
    ],
    isaakHelp: "Pídele a Isaak: 'qué clientes requieren seguimiento esta semana'.",
    suggestedPrompt: "Qué clientes requieren seguimiento esta semana",
  },
  {
    id: "banks",
    path: "/demo/banks",
    title: "4. Cierra conciliación sin fricción",
    description:
      "Revisa movimientos, pendientes de casar y señales de gasto para tomar decisiones rápidas.",
    checklist: [
      "Localizar no conciliados",
      "Ver patrón de movimientos",
      "Preparar cierre semanal",
    ],
    isaakHelp: "Pídele a Isaak: 'qué movimientos siguen sin conciliar'.",
    suggestedPrompt: "Qué movimientos siguen sin conciliar",
  },
  {
    id: "calendar",
    path: "/demo/calendar",
    title: "5. Evita sustos fiscales",
    description:
      "Termina revisando plazos para organizar trabajo, modelos y recordatorios.",
    checklist: [
      "Ver próximos vencimientos",
      "Priorizar tareas de esta semana",
      "Crear plan de ejecución",
    ],
    isaakHelp: "Pídele a Isaak: 'dame plan semanal de plazos y tareas'.",
    suggestedPrompt: "Dame plan semanal de plazos y tareas",
  },
];

export function DemoGuidedTour({ isOpen, onClose, onComplete }: DemoGuidedTourProps) {
  const pathname = usePathname() || "/demo";
  const router = useRouter();

  const currentIndex = useMemo(() => {
    const idx = TOUR_STEPS.findIndex((step) =>
      step.path === "/demo" ? pathname === "/demo" : pathname.startsWith(step.path)
    );
    return idx >= 0 ? idx : 0;
  }, [pathname]);

  const currentStep = TOUR_STEPS[currentIndex];
  const isLast = currentIndex === TOUR_STEPS.length - 1;

  const goToStep = (index: number) => {
    const nextStep = TOUR_STEPS[index];
    if (!nextStep) return;
    router.push(nextStep.path);
  };

  const openIsaakWithPrompt = () => {
    try {
      localStorage.setItem(ISAAK_PREFILL_KEY, currentStep.suggestedPrompt);
    } catch {
      // Best-effort only
    }
    router.push("/demo/isaak");
  };

  const handleNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    goToStep(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex === 0) return;
    goToStep(currentIndex - 1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6cfb]">Tour guiado demo</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{currentStep.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{currentStep.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          {TOUR_STEPS.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(idx)}
              className={`h-2 flex-1 rounded-full transition-colors ${
                idx <= currentIndex ? "bg-[#0b6cfb]" : "bg-slate-200"
              }`}
              aria-label={`Ir al paso ${idx + 1}`}
            />
          ))}
        </div>

        <ul className="mt-4 space-y-2">
          {currentStep.checklist.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#0b6cfb]" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-800">
          <span className="font-semibold">Ayuda de Isaak:</span> {currentStep.isaakHelp}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium text-slate-500">
            Paso {currentIndex + 1} de {TOUR_STEPS.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={openIsaakWithPrompt}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Abrir Isaak
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-full bg-[#0b6cfb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#095edb]"
            >
              {isLast ? "Finalizar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
