// F4 Judge model. Independent second opinion (GPT-4o-mini) on every WRITE
// tool the main LLM (Claude Sonnet) wants to invoke. Different provider →
// different sycophancy / blind-spots; the judge catches Sonnet acting on
// half-correct context.
//
// Verdicts:
//   - allow              → execute the tool
//   - needs_confirmation → block AND tell the model to summarize + ask user
//   - block              → block AND tell the model the action looks wrong
//
// On any judge error: defaults to 'block' (parseJudgeJson handles this).
// Never silently lets a write through.

import { callLLM, AIError } from '@verifactu/utils';
import {
  emptyJudgeResult,
  parseJudgeJson,
  type JudgeResult,
} from './isaak-judge-parser';

export type { JudgeResult, JudgeVerdict } from './isaak-judge-parser';

const JUDGE_MODEL = 'gpt-4o-mini';

export type JudgeRequest = {
  toolName: string;
  toolInput: Record<string, unknown>;
  recentTurns: { role: 'user' | 'assistant'; content: string }[];
};

function buildJudgeInstructions(): string {
  return `Eres el validador independiente de Isaak. Recibes una ACCIÓN que otro LLM (Claude) quiere ejecutar y la conversación reciente con el usuario. Tu única tarea: decidir si la acción coincide con lo que el usuario pidió, y si los datos parecen completos y correctos.

Devuelve EXCLUSIVAMENTE un JSON válido (sin markdown ni backticks) con este schema:
{
  "verdict": "allow" | "block" | "needs_confirmation",
  "reasoning": string,
  "blockers": string[]
}

Reglas para el verdict:
- "allow": la acción está claramente justificada por el último mensaje del usuario Y los datos son completos (importes, destinatarios, fechas presentes). Reservado SOLO para casos en los que el usuario ha confirmado explícitamente ("sí", "confirma", "adelante") en el último mensaje.
- "needs_confirmation": la acción es coherente con la conversación pero NO hay confirmación explícita del usuario en el último turno. El modelo debe resumir lo que va a hacer y pedir confirmación antes.
- "block": la acción no se justifica, contradice algo previo, o le faltan datos críticos (importe vacío, destinatario en blanco, factura no identificada).

Reglas para blockers (array de razones cortas en español, máximo 4):
- "missing_amount"        — falta el importe
- "missing_recipient"     — falta destinatario / cliente
- "missing_concept"       — falta concepto o descripción
- "no_user_confirmation"  — el usuario no ha dicho "sí"
- "contradicts_history"   — contradice un dato ya conversado
- "out_of_scope"          — el usuario no pidió esta acción
- "data_inconsistent"     — los datos del tool no encajan entre sí
Si no hay blockers (verdict=allow), devuelve [].

Sé conservador. Prefiere "needs_confirmation" sobre "allow" cuando haya duda. Prefiere "block" sobre "needs_confirmation" cuando los datos sean obviamente incorrectos.`;
}

function buildJudgeUserMessage(req: JudgeRequest): string {
  const historyBlock = req.recentTurns
    .slice(-6)
    .map((t) => `[${t.role}] ${t.content.slice(0, 800)}`)
    .join('\n');

  return `ACCIÓN PROPUESTA:
${JSON.stringify({ tool: req.toolName, input: req.toolInput }, null, 2)}

CONVERSACIÓN RECIENTE:
${historyBlock || '(sin historia previa)'}

Devuelve el JSON con verdict, reasoning y blockers.`;
}

export async function judgeWriteAction(req: JudgeRequest): Promise<JudgeResult> {
  const start = Date.now();
  try {
    const result = await callLLM({
      provider: 'openai',
      model: JUDGE_MODEL,
      instructions: buildJudgeInstructions(),
      inputText: buildJudgeUserMessage(req),
      temperature: 0,
      maxOutputTokens: 250,
      responseFormat: 'json_object',
      feature: 'isaak_judge_write',
      enableFallback: false,
    });
    const latencyMs = Date.now() - start;
    return parseJudgeJson(result.text, result.model, latencyMs);
  } catch (error) {
    const latencyMs = Date.now() - start;
    const reason =
      error instanceof AIError ? `${error.kind}:${error.provider}` : 'unknown_error';
    console.error('[isaak-judge] failed', { reason, latencyMs, tool: req.toolName });
    return emptyJudgeResult(reason, JUDGE_MODEL, latencyMs);
  }
}
