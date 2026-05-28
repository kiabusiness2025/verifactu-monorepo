// F3: Haiku intent classifier.
//
// Runs BEFORE the main Sonnet call to decide:
//   - Is the query ambiguous? (period / entity / intent / amount)
//   - Does the query need real data via tools? (yes/no)
//   - If yes, which categories matter? (holded / banking / google / microsoft)
//
// Routing then (handled by the caller):
//   - Ambiguous → return clarify JSON directly (skip Sonnet, ~600ms saved)
//   - !needsTools → Sonnet WITHOUT tools (no 3.5k schema tokens)
//   - needsTools → Sonnet WITH tools filtered to relevantCategories
//
// Haiku is ~12x cheaper than Sonnet and ~3x faster. The classifier pays
// for itself even when it doesn't reroute, because filtering tools alone
// saves more tokens than the Haiku call costs.

import { callLLM, AIError } from '@verifactu/utils';
import {
  emptyClassificationResult,
  parseClassifierJson,
  type ClassificationResult,
} from './isaak-intent-classifier-parser';

export type {
  AmbiguityType,
  ClassificationResult,
  ToolCategory,
} from './isaak-intent-classifier-parser';

export type ClassifierContext = {
  holdedConnected: boolean;
  bankConnected: boolean;
  googleConnected: boolean;
  microsoftConnected: boolean;
  sectorConnected?: boolean;
};

const CLASSIFIER_MODEL = 'claude-haiku-4-5-20251001';

function buildClassifierPrompt(ctx: ClassifierContext): string {
  const integrations =
    [
      ctx.holdedConnected ? 'Holded (ERP)' : null,
      ctx.bankConnected ? 'banca PSD2' : null,
      ctx.googleConnected ? 'Google' : null,
      ctx.microsoftConnected ? 'Microsoft 365' : null,
      ctx.sectorConnected ? 'software sectorial (PMS/POS/ERP)' : null,
    ]
      .filter(Boolean)
      .join(', ') || 'ninguna';

  return `Eres el clasificador de intent de Isaak. Tu única función es analizar el último mensaje del usuario en una conversación de copiloto fiscal y clasificarlo.

Integraciones disponibles del tenant: ${integrations}.

Devuelve EXCLUSIVAMENTE JSON válido (sin markdown, sin backticks, sin texto extra) con este schema:
{
  "ambiguous": boolean,
  "ambiguityType": "period" | "entity" | "intent" | "amount" | "none",
  "suggestedClarification": string | null,
  "suggestedOptions": string[] | null,
  "needsTools": boolean,
  "relevantCategories": ("holded" | "banking" | "google" | "microsoft")[],
  "hasWriteIntent": boolean
}

Reglas:
- ambiguous=true si falta info crítica (período sin contexto, cliente sin nombre, intent sin claridad, importe sin cifra). Si previamente la persona ya respondió eso, NO sigue siendo ambiguo.
- ambiguityType = "none" cuando ambiguous=false. Si ambiguous=true, especifica el tipo dominante.
- suggestedClarification (1 frase corta en español) y suggestedOptions (2-4 opciones) sólo si ambiguous=true. Si no, ambos null.
- needsTools=true si el usuario pide DATOS REALES del negocio (saldo, facturas, P&L, clientes, transacciones, calendario, emails). NO necesita tools para: saludos, preguntas conceptuales, plazos genéricos, dudas legales/fiscales generales, clarificaciones a Isaak.
- relevantCategories: si needsTools=true, indica qué subconjunto importa. Si needsTools=false, devuelve [].
  - "holded": facturación, contactos, productos, P&L, asientos, Verifactu, pagos registrados en ERP
  - "banking": saldos en cuenta, movimientos bancarios, tesorería, previsión de caja, conciliación
  - "google": Google Calendar, Gmail, Google Drive
  - "microsoft": Outlook Calendar, Outlook Mail, OneDrive
- Si needsTools=true pero el tenant NO tiene esa categoría conectada, igual marca relevantCategories — quien orquesta decidirá si pedir conectar.
- hasWriteIntent=true si el usuario pide MODIFICAR algo: crear/emitir factura, registrar pago, dar de alta cliente, enviar documento, archivar email. NO marcar true para preguntas o consultas. También true cuando el usuario CONFIRMA una acción anterior ("sí, hazlo", "confirma", "adelante").

Ejemplos:
- "hola" → {"ambiguous":false,"ambiguityType":"none","suggestedClarification":null,"suggestedOptions":null,"needsTools":false,"relevantCategories":[],"hasWriteIntent":false}
- "ventas" → {"ambiguous":true,"ambiguityType":"period","suggestedClarification":"¿De qué período quieres ver las ventas?","suggestedOptions":["Este mes","Este trimestre","Este año"],"needsTools":false,"relevantCategories":[],"hasWriteIntent":false}
- "ventas de marzo" → {"ambiguous":false,"ambiguityType":"none","suggestedClarification":null,"suggestedOptions":null,"needsTools":true,"relevantCategories":["holded"],"hasWriteIntent":false}
- "saldo en banco" → {"ambiguous":false,"ambiguityType":"none","suggestedClarification":null,"suggestedOptions":null,"needsTools":true,"relevantCategories":["banking"],"hasWriteIntent":false}
- "qué es Verifactu" → {"ambiguous":false,"ambiguityType":"none","suggestedClarification":null,"suggestedOptions":null,"needsTools":false,"relevantCategories":[],"hasWriteIntent":false}
- "emite una factura a Acme por 500€ de servicios de consultoría" → {"ambiguous":false,"ambiguityType":"none","suggestedClarification":null,"suggestedOptions":null,"needsTools":true,"relevantCategories":["holded"],"hasWriteIntent":true}
- "sí, confirma" → {"ambiguous":false,"ambiguityType":"none","suggestedClarification":null,"suggestedOptions":null,"needsTools":true,"relevantCategories":["holded"],"hasWriteIntent":true}`;
}

export type ClassifyIntentInput = {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  context: ClassifierContext;
};

export async function classifyIntent(input: ClassifyIntentInput): Promise<ClassificationResult> {
  const start = Date.now();
  const recentHistory = input.history.slice(-4); // ~2 turnos previos

  try {
    const result = await callLLM({
      provider: 'anthropic',
      model: CLASSIFIER_MODEL,
      instructions: buildClassifierPrompt(input.context),
      messages: [...recentHistory, { role: 'user', content: input.message }],
      temperature: 0,
      maxOutputTokens: 250,
      feature: 'isaak_intent_classifier',
      enableFallback: false,
    });

    const latencyMs = Date.now() - start;
    return parseClassifierJson(result.text, result.model, latencyMs);
  } catch (error) {
    const latencyMs = Date.now() - start;
    const reason = error instanceof AIError ? `${error.kind}:${error.provider}` : 'unknown_error';
    console.error('[isaak-intent-classifier] failed', { reason, latencyMs });
    return emptyClassificationResult(reason, CLASSIFIER_MODEL, latencyMs);
  }
}
