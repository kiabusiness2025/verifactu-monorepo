"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

const ISAAK_PREFILL_KEY = "vf_isaak_prefill_prompt_v1";

function extractPromptFromTip(tip: string) {
  const quoted = tip.match(/["'“”]([^"'“”]+)["'“”]/);
  if (quoted?.[1]) return quoted[1].trim();
  return tip.replace(/^Pregúntale a Isaak:\s*/i, "").trim();
}

type DemoLockedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  toastMessage?: string;
  toastDurationMs?: number;
  experience?: "modal" | "toast";
  guideTitle?: string;
  guideDescription?: string;
  guideSteps?: string[];
  isaakTip?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
};

function inferGuide(children: React.ReactNode) {
  const text = typeof children === "string" ? children : "";
  const normalized = text.toLowerCase();

  if (normalized.includes("factura")) {
    return {
      title: "Flujo guiado: crear factura",
      description: "En tu cuenta real podrás emitir facturas completas y enviarlas con trazabilidad VeriFactu.",
      steps: [
        "Selecciona cliente y concepto en menos de 1 minuto",
        "Isaak valida impuestos y campos obligatorios",
        "Emite, comparte y haz seguimiento del cobro",
      ],
      tip: "Pregúntale a Isaak: 'qué factura debería cobrar primero'.",
    };
  }

  if (normalized.includes("banco") || normalized.includes("conciliar")) {
    return {
      title: "Flujo guiado: conectar banco",
      description: "Con datos reales podrás sincronizar movimientos y conciliar automáticamente.",
      steps: [
        "Conecta tu entidad con acceso seguro",
        "Isaak detecta movimientos y sugiere conciliación",
        "Revisas excepciones y cierras en minutos",
      ],
      tip: "Pregúntale a Isaak: 'qué movimientos siguen pendientes'.",
    };
  }

  if (normalized.includes("documento") || normalized.includes("subir")) {
    return {
      title: "Flujo guiado: subir documentos",
      description: "En modo real podrás centralizar tickets, contratos y justificantes para tu cierre.",
      steps: [
        "Sube archivo o foto desde web/móvil",
        "Isaak propone categoría y validaciones",
        "Queda listo para contabilidad y asesoría",
      ],
      tip: "Pregúntale a Isaak: 'qué documentos faltan para cerrar'.",
    };
  }

  if (normalized.includes("cliente")) {
    return {
      title: "Flujo guiado: alta de cliente",
      description: "En tu cuenta real crearás clientes y verás su historial de facturación al instante.",
      steps: [
        "Alta rápida de datos fiscales",
        "Isaak sugiere condiciones de cobro",
        "Seguimiento por cliente y alertas",
      ],
      tip: "Pregúntale a Isaak: 'cuáles son mis clientes clave'.",
    };
  }

  if (normalized.includes("usuario") || normalized.includes("equipo")) {
    return {
      title: "Flujo guiado: invitar equipo",
      description: "Podrás añadir usuarios con roles y permisos para trabajar en equipo.",
      steps: [
        "Invita por correo en segundos",
        "Asigna roles por área (facturas, bancos, admin)",
        "Isaak adapta recomendaciones según rol",
      ],
      tip: "Pregúntale a Isaak: 'qué rol necesita cada usuario'.",
    };
  }

  return {
    title: "Función disponible en tu prueba",
    description: "Esta acción está lista para usarse con tus datos reales al activar la prueba.",
    steps: [
      "Activa tu prueba de 30 días",
      "Conecta tu empresa en onboarding",
      "Deja que Isaak te guíe paso a paso",
    ],
    tip: "Isaak detectará automáticamente la pantalla donde estés para ayudarte mejor.",
  };
}

export function DemoLockedButton({
  toastMessage = "Disponible al activar tu prueba",
  toastDurationMs = 2200,
  experience = "modal",
  guideTitle,
  guideDescription,
  guideSteps,
  isaakTip,
  ctaLabel = "Activar prueba (30 días)",
  ctaHref = "/dashboard/onboarding?next=/dashboard",
  secondaryCtaLabel = "Hablar con Isaak en demo",
  secondaryCtaHref = "/demo/isaak",
  className,
  onClick,
  children,
  ...props
}: DemoLockedButtonProps) {
  const [showToast, setShowToast] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const inferred = inferGuide(children);
  const title = guideTitle || inferred.title;
  const description = guideDescription || inferred.description;
  const steps = guideSteps || inferred.steps;
  const tip = isaakTip || inferred.tip;

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), toastDurationMs);
    return () => clearTimeout(timer);
  }, [showToast, toastDurationMs]);

  return (
    <div className="relative">
      <button
        type="button"
        className={className}
        onClick={(event) => {
          onClick?.(event);
          if (experience === "toast") {
            setShowToast(true);
          } else {
            setShowGuide(true);
          }
        }}
        {...props}
      >
        {children}
      </button>
      {showToast && (
        <div className="absolute right-0 top-11 z-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-lg">
          {toastMessage}
        </div>
      )}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4" onClick={() => setShowGuide(false)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b6cfb]">Demo guiada</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>

            <ul className="mt-4 space-y-2">
              {steps.map((step, idx) => (
                <li key={`${step}-${idx}`} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0b6cfb]/10 text-[11px] font-semibold text-[#0b6cfb]">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-800">
              <span className="font-semibold">Isaak sugiere:</span> {tip}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href={ctaHref}
                className="inline-flex items-center rounded-full bg-[#0b6cfb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#095edb]"
              >
                {ctaLabel}
              </Link>
              <Link
                href={secondaryCtaHref}
                onClick={() => {
                  try {
                    localStorage.setItem(ISAAK_PREFILL_KEY, extractPromptFromTip(tip));
                  } catch {
                    // Best-effort only
                  }
                  setShowGuide(false);
                }}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {secondaryCtaLabel}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
