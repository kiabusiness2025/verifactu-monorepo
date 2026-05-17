/**
 * WA-IV — WhatsApp Flows para Isaak
 *
 * ISAAK_FLOW_JSON: copiar en Meta Business Manager → WhatsApp → Flows → Crear.
 *   Idioma: es_ES · Categoría: CUSTOMER_SUPPORT
 *   Una vez publicado, anotar el Flow ID en WHATSAPP_FLOW_ID_CONSULTA (env var).
 *
 * Estado: PENDIENTE DE PUBLICACIÓN EN META
 */

// ── JSON del Flow ──────────────────────────────────────────────────────────────
//
// Pantalla única "CONSULTA": topic (Dropdown) + period (RadioButtonsGroup) + free_text (TextInput)

export const ISAAK_FLOW_JSON = {
  version: '3.0',
  screens: [
    {
      id: 'CONSULTA',
      title: 'Consulta a Isaak',
      terminal: true,
      layout: {
        type: 'SingleColumnLayout',
        children: [
          {
            type: 'Form',
            name: 'consulta_form',
            children: [
              {
                type: 'Dropdown',
                label: '¿Sobre qué quieres consultar?',
                name: 'topic',
                required: true,
                'data-source': [
                  { id: 'ventas', title: 'Ventas' },
                  { id: 'gastos', title: 'Gastos' },
                  { id: 'facturas', title: 'Facturas pendientes' },
                  { id: 'iva', title: 'IVA trimestral' },
                  { id: 'libre', title: 'Otra consulta' },
                ],
              },
              {
                type: 'RadioButtonsGroup',
                label: '¿Qué período?',
                name: 'period',
                required: false,
                'data-source': [
                  { id: 'este_mes', title: 'Este mes' },
                  { id: 'trimestre', title: 'Trimestre actual' },
                  { id: 'anio', title: 'Este año' },
                ],
              },
              {
                type: 'TextInput',
                label: 'Tu consulta (solo para "Otra consulta")',
                name: 'free_text',
                'input-type': 'text',
                required: false,
                'helper-text': 'Escríbela aquí si elegiste "Otra consulta"',
              },
              {
                type: 'Footer',
                label: 'Enviar consulta',
                'on-click-action': {
                  name: 'complete',
                  payload: {
                    topic: '${form.topic}',
                    period: '${form.period}',
                    free_text: '${form.free_text}',
                  },
                },
              },
            ],
          },
        ],
      },
    },
  ],
};

// ── Tipos de respuesta nfm_reply ──────────────────────────────────────────────

export type WaFlowResponseData = {
  topic?: string; // ventas | gastos | facturas | iva | libre
  period?: string; // este_mes | trimestre | anio
  free_text?: string;
};

// ── Conversor Flow → query Isaak ──────────────────────────────────────────────

const PERIOD_PHRASES: Record<string, string> = {
  este_mes: 'de este mes',
  trimestre: 'del trimestre actual',
  anio: 'del año completo',
};

/** Convierte los datos del formulario en una pregunta natural para el LLM. */
export function buildIsaakQueryFromFlow(data: WaFlowResponseData): string | null {
  const { topic, period, free_text } = data;
  const periodPhrase = period ? (PERIOD_PHRASES[period] ?? '') : '';

  if (!topic || topic === 'libre') {
    return free_text?.trim() || null;
  }

  if (topic === 'iva') {
    return `Estima mi IVA${periodPhrase ? ` ${periodPhrase}` : ' del trimestre actual'} con los datos disponibles.`;
  }
  if (topic === 'facturas') {
    return '¿Qué facturas tengo pendientes de cobro?';
  }
  if (topic === 'ventas') {
    return `Dame el resumen de ventas${periodPhrase ? ` ${periodPhrase}` : ' de este mes'}.`;
  }
  if (topic === 'gastos') {
    return `Muéstrame los gastos${periodPhrase ? ` ${periodPhrase}` : ' de este mes'}.`;
  }

  return free_text?.trim() || null;
}
