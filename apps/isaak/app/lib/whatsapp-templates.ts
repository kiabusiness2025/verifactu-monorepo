/**
 * WA-III — Definición de templates HSM para alertas proactivas.
 *
 * IMPORTANTE: Cada template debe registrarse en Meta Business Manager antes
 * de poder enviarse. El nombre del template en este archivo debe coincidir
 * EXACTAMENTE con el nombre aprobado en Meta.
 *
 * Registro: Meta Business Manager → WhatsApp → Plantillas de mensajes → Crear
 * Idioma: es_ES · Categoría: UTILITY
 * Tiempo de aprobación estimado: 24-48h
 *
 * Estado actual:
 *   - fiscal_deadline_reminder   → PENDIENTE DE REGISTRO
 *   - facturas_pendientes_cobro  → PENDIENTE DE REGISTRO
 *   - recordatorio_modelo_303    → PENDIENTE DE REGISTRO
 */

import type { WaTemplateComponent } from './whatsapp';

// ── Template 1: Vencimiento de plazo fiscal ───────────────────────────────────
//
// Cuerpo para Meta:
// "Hola {{1}}, el plazo para presentar el {{2}} vence el {{3}} (en {{4}} días).
//  Accede a Isaak para ver tu estimación completa."
//
// Parámetros: [firstName, modelo, fechaVencimiento, diasRestantes]

export const TEMPLATE_FISCAL_DEADLINE = 'fiscal_deadline_reminder';

export function buildFiscalDeadlineComponents(
  firstName: string,
  modelo: string,
  fechaVencimiento: string,
  diasRestantes: number
): WaTemplateComponent[] {
  return [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: firstName },
        { type: 'text', text: modelo },
        { type: 'text', text: fechaVencimiento },
        { type: 'text', text: String(diasRestantes) },
      ],
    },
  ];
}

// ── Template 2: Facturas pendientes de cobro ──────────────────────────────────
//
// Cuerpo para Meta:
// "Hola {{1}}, tienes {{2}} facturas pendientes de cobro por un total de {{3}} €.
//  La más antigua lleva {{4}} días sin pagarse."
//
// Parámetros: [firstName, numFacturas, totalEuros, diasMasAntigua]

export const TEMPLATE_FACTURAS_PENDIENTES = 'facturas_pendientes_cobro';

export function buildFacturasPendientesComponents(
  firstName: string,
  numFacturas: number,
  totalEuros: string,
  diasMasAntigua: number
): WaTemplateComponent[] {
  return [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: firstName },
        { type: 'text', text: String(numFacturas) },
        { type: 'text', text: totalEuros },
        { type: 'text', text: String(diasMasAntigua) },
      ],
    },
  ];
}

// ── Template 3: Recordatorio modelo 303 ──────────────────────────────────────
//
// Cuerpo para Meta:
// "Hola {{1}}, el modelo 303 del {{2}} trimestre vence el {{3}}.
//  Recuerda presentarlo a tiempo para evitar recargos."
//
// Parámetros: [firstName, trimestre, fechaVencimiento]

export const TEMPLATE_MODELO_303 = 'recordatorio_modelo_303';

export function buildModelo303Components(
  firstName: string,
  trimestre: string,
  fechaVencimiento: string
): WaTemplateComponent[] {
  return [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: firstName },
        { type: 'text', text: trimestre },
        { type: 'text', text: fechaVencimiento },
      ],
    },
  ];
}

// ── Selector automático de template por tipo de alerta ───────────────────────

export type FiscalAlertTemplateInput = {
  firstName: string;
  alertType: string; // e.g. "fiscal_deadline_d7_303_trimestral"
  modelo?: string;
  fechaVencimiento?: string;
  diasRestantes?: number;
  trimestre?: string;
};

/** Devuelve { templateName, components } o null si el tipo no tiene template WA. */
export function resolveAlertTemplate(input: FiscalAlertTemplateInput): {
  templateName: string;
  components: WaTemplateComponent[];
} | null {
  const { firstName, alertType, modelo, fechaVencimiento, diasRestantes, trimestre } = input;

  if (alertType.includes('303') && trimestre && fechaVencimiento) {
    return {
      templateName: TEMPLATE_MODELO_303,
      components: buildModelo303Components(firstName, trimestre, fechaVencimiento),
    };
  }

  if (alertType.includes('deadline') && modelo && fechaVencimiento && diasRestantes !== undefined) {
    return {
      templateName: TEMPLATE_FISCAL_DEADLINE,
      components: buildFiscalDeadlineComponents(firstName, modelo, fechaVencimiento, diasRestantes),
    };
  }

  return null;
}
