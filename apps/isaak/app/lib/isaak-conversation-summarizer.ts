// V1.3.3 — Compactación de conversaciones largas.
//
// Para evitar enviar 50+ mensajes al LLM y para mantener el contexto
// relevante entre turnos, periódicamente resumimos los mensajes "viejos"
// (todos menos los últimos N) en una sola entrada en IsaakConversationSummary.
//
// Flujo en el chat stream:
//   1. Al cargar history: junto a los últimos SHORT_MEMORY_TURNS mensajes,
//      cargamos también el summary existente y lo inyectamos al system
//      prompt como "Resumen de turnos anteriores".
//   2. Fire-and-forget tras responder: si la conversación pasó el umbral,
//      regeneramos el summary cubriendo todos los mensajes menos los
//      últimos SHORT_MEMORY_TURNS — así nunca se pierde nada.
//
// El upsert por conversationId hace la operación idempotente: re-correr
// produce el mismo resultado o uno mejor (más reciente).

import { callLLM } from '@verifactu/utils';
import { prisma } from './prisma';

const SUMMARIZE_THRESHOLD = 16; // total messages above which we summarize
const KEEP_RECENT = 8;          // turns to keep raw at the end (= SHORT_MEMORY_TURNS)
const MIN_OLDER_BATCH = 4;      // don't bother summarizing fewer than this

const SUMMARIZER_PROMPT = `Eres el compactador de memoria de Isaak. Recibes una lista de turnos antiguos de una conversación entre un usuario y el asistente Isaak (que ayuda con temas fiscales y contables).

Tu trabajo: producir un resumen estructurado que conserve los HECHOS y DECISIONES importantes que se necesitan en futuros turnos, descartando saludos, pruebas, dudas resueltas y repeticiones.

Devuelve EXACTAMENTE este JSON (sin texto adicional ni markdown):
{
  "summary": "<resumen en 3-6 frases en tercera persona, con datos concretos cuando los haya: períodos, importes, NIFs, decisiones tomadas>",
  "openLoops": ["<tema pendiente 1>", "<tema pendiente 2>"],
  "userPreferences": ["<preferencia revelada por el usuario 1>"]
}

Reglas:
- El summary se inyecta al system prompt en futuros turnos — debe ser útil y conciso, NO una transcripción.
- openLoops: cosas que quedaron a medias o pendientes de información del usuario.
- userPreferences: cosas que el usuario ha dicho sobre cómo le gusta trabajar (tono, idioma, formato).
- Si los turnos no aportan nada memorable, devuelve summary: "" y arrays vacíos.
- Máx 1500 caracteres para summary.`;

export type SummarizationResult = {
  triggered: boolean;
  summaryChars: number;
  openLoops: number;
  userPreferences: number;
  latencyMs: number;
  totalMessages: number;
  summarizedMessages: number;
  error?: string;
};

export async function summarizeOlderTurns(
  conversationId: string,
): Promise<SummarizationResult> {
  const start = Date.now();
  const total = await prisma.isaakConversationMsg.count({
    where: { conversationId },
  });

  if (total < SUMMARIZE_THRESHOLD) {
    return {
      triggered: false,
      summaryChars: 0,
      openLoops: 0,
      userPreferences: 0,
      latencyMs: 0,
      totalMessages: total,
      summarizedMessages: 0,
    };
  }

  const olderCount = total - KEEP_RECENT;
  if (olderCount < MIN_OLDER_BATCH) {
    return {
      triggered: false,
      summaryChars: 0,
      openLoops: 0,
      userPreferences: 0,
      latencyMs: 0,
      totalMessages: total,
      summarizedMessages: 0,
    };
  }

  // Cargamos los `olderCount` más antiguos en orden cronológico ascendente.
  const older = await prisma.isaakConversationMsg.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: olderCount,
    select: { role: true, content: true, createdAt: true },
  });

  const filtered = older.filter((m) => m.role === 'user' || m.role === 'assistant');
  if (filtered.length < MIN_OLDER_BATCH) {
    return {
      triggered: false,
      summaryChars: 0,
      openLoops: 0,
      userPreferences: 0,
      latencyMs: Date.now() - start,
      totalMessages: total,
      summarizedMessages: 0,
    };
  }

  const transcript = filtered
    .map((m) => `[${m.role}] ${m.content.slice(0, 1500)}`)
    .join('\n\n');

  let summary = '';
  let openLoops: string[] = [];
  let userPreferences: string[] = [];

  try {
    const response = await callLLM({
      feature: 'conversation_summarizer',
      instructions: SUMMARIZER_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Resume estos ${filtered.length} turnos antiguos:\n\n${transcript.slice(0, 12000)}`,
        },
      ],
      responseFormat: 'json_object',
      temperature: 0,
      maxOutputTokens: 800,
    });

    const parsed = JSON.parse(response.text) as {
      summary?: unknown;
      openLoops?: unknown;
      userPreferences?: unknown;
    };
    summary = typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 1500) : '';
    openLoops = Array.isArray(parsed.openLoops)
      ? (parsed.openLoops as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 10)
      : [];
    userPreferences = Array.isArray(parsed.userPreferences)
      ? (parsed.userPreferences as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 10)
      : [];
  } catch (err) {
    return {
      triggered: true,
      summaryChars: 0,
      openLoops: 0,
      userPreferences: 0,
      latencyMs: Date.now() - start,
      totalMessages: total,
      summarizedMessages: filtered.length,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (!summary) {
    return {
      triggered: true,
      summaryChars: 0,
      openLoops: 0,
      userPreferences: 0,
      latencyMs: Date.now() - start,
      totalMessages: total,
      summarizedMessages: filtered.length,
    };
  }

  try {
    await prisma.isaakConversationSummary.upsert({
      where: { conversationId },
      create: {
        conversationId,
        summary,
        openLoopsJson: openLoops.length > 0 ? openLoops : undefined,
        userPreferencesJson: userPreferences.length > 0 ? userPreferences : undefined,
      },
      update: {
        summary,
        openLoopsJson: openLoops.length > 0 ? openLoops : undefined,
        userPreferencesJson: userPreferences.length > 0 ? userPreferences : undefined,
      },
    });
  } catch (err) {
    return {
      triggered: true,
      summaryChars: summary.length,
      openLoops: openLoops.length,
      userPreferences: userPreferences.length,
      latencyMs: Date.now() - start,
      totalMessages: total,
      summarizedMessages: filtered.length,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return {
    triggered: true,
    summaryChars: summary.length,
    openLoops: openLoops.length,
    userPreferences: userPreferences.length,
    latencyMs: Date.now() - start,
    totalMessages: total,
    summarizedMessages: filtered.length,
  };
}

export type StoredConversationSummary = {
  summary: string;
  openLoops: string[];
  userPreferences: string[];
};

export async function loadConversationSummary(
  conversationId: string,
): Promise<StoredConversationSummary | null> {
  const row = await prisma.isaakConversationSummary.findUnique({
    where: { conversationId },
    select: { summary: true, openLoopsJson: true, userPreferencesJson: true },
  });
  if (!row || !row.summary) return null;
  return {
    summary: row.summary,
    openLoops: Array.isArray(row.openLoopsJson)
      ? (row.openLoopsJson as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
    userPreferences: Array.isArray(row.userPreferencesJson)
      ? (row.userPreferencesJson as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
  };
}

/**
 * Formatea el summary para inyectarlo en el system prompt como un bloque.
 */
export function formatSummaryForPrompt(stored: StoredConversationSummary): string {
  const lines: string[] = ['== Resumen de turnos anteriores (auto) =='];
  lines.push(stored.summary);
  if (stored.openLoops.length > 0) {
    lines.push('');
    lines.push('Temas pendientes:');
    for (const item of stored.openLoops) lines.push(`- ${item}`);
  }
  if (stored.userPreferences.length > 0) {
    lines.push('');
    lines.push('Preferencias del usuario reveladas:');
    for (const item of stored.userPreferences) lines.push(`- ${item}`);
  }
  return lines.join('\n');
}
