// V1.3.2 — Auto-extractor de hechos memorables para Isaak.
//
// Se ejecuta fire-and-forget al final de cada turno del chat. Analiza el
// mensaje del usuario + la respuesta del asistente y, si detecta algo
// digno de recordar (preferencia, dato fijo del negocio, decisión), lo
// guarda en IsaakLongTermMemory para que en futuros turnos se inyecte
// automáticamente al system prompt vía retrieveFactsForChat.
//
// Diferencia con isaak_remember: aquí Isaak guarda SIN que el usuario lo
// pida explícitamente. Solo extrae lo que de verdad querría reusar.
//
// Salvaguardas:
//   - Mínimos de tamaño del mensaje (evita ruido).
//   - Dedup por similarity (si ya existe un fact similar ≥ MIN_SIMILARITY
//     no inserta).
//   - Cuota soft: máx 5 facts auto por conversación.
//   - Fail-silent: nunca tira el chat si esto falla.

import { callLLM } from '@verifactu/utils';
import {
  retrieveRelevantFacts,
  storeMemoryFact,
  type FactType,
} from './isaak-long-term-memory';

const MIN_USER_MSG_LENGTH = 20;
const DEDUP_SIMILARITY = 0.85;
const MAX_FACTS_PER_TURN = 3;
const FACT_TYPES: FactType[] = ['preference', 'history', 'decision', 'profile', 'other'];

const EXTRACTOR_SYSTEM_PROMPT = `Eres un extractor de hechos memorables para Isaak (asistente fiscal y operativo).

A partir de un mensaje del usuario y la respuesta del asistente, devuelve los hechos que sería útil RECORDAR a largo plazo — datos que el usuario probablemente quiera que Isaak retenga entre conversaciones.

REGLAS ESTRICTAS:
1. Solo extrae lo que el usuario revele sobre sí mismo, su empresa o su forma de trabajar. NO extraigas datos generales que ya están en el corpus AEAT ni explicaciones genéricas de Isaak.
2. Cada hecho en UNA sola frase autocontenida en tercera persona ("El usuario prefiere X", "La empresa factura en régimen Y").
3. NO inventes ni infieras agresivamente. Si no es explícito en el mensaje, no lo guardes.
4. NO guardes:
   - Saludos, agradecimientos, preguntas o dudas pasajeras.
   - Datos sensibles (contraseñas, tarjetas, claves).
   - Hechos sobre terceros (clientes, proveedores) salvo que sean una decisión del usuario ("tratamos a Acme como cliente premium").
   - Cosas obvias o ya en el perfil estándar.
5. Devuelve MÁXIMO 3 hechos. Si no hay nada digno de recordar, devuelve { "facts": [] }.

Devuelve EXACTAMENTE este JSON (sin texto adicional, sin markdown):
{
  "facts": [
    { "fact": "<frase>", "factType": "preference" | "profile" | "decision" | "history" | "other" }
  ]
}

Significado de factType:
- profile: dato fijo del negocio (NIF, sector, régimen IVA, estructura).
- preference: gusto/estilo del usuario (brevedad, formalidad, idioma).
- decision: decisión tomada que debe respetarse en el futuro.
- history: evento pasado relevante para futuras decisiones.
- other: el resto.`;

type ExtractedFact = { fact: string; factType: FactType };

type ExtractInput = {
  tenantId: string;
  userId: string;
  conversationId?: string | null;
  userMessage: string;
  assistantText: string;
};

type ExtractResult = {
  candidates: number;
  inserted: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  latencyMs: number;
  error?: string;
};

export async function autoExtractAndStoreFacts(input: ExtractInput): Promise<ExtractResult> {
  const start = Date.now();
  const userMsg = (input.userMessage ?? '').trim();
  const reply = (input.assistantText ?? '').trim();

  if (userMsg.length < MIN_USER_MSG_LENGTH) {
    return { candidates: 0, inserted: 0, skippedDuplicates: 0, skippedInvalid: 0, latencyMs: 0 };
  }

  let candidates: ExtractedFact[];
  try {
    const response = await callLLM({
      feature: 'memory_extractor',
      instructions: EXTRACTOR_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Mensaje del usuario:\n"""${userMsg.slice(0, 2000)}"""\n\nRespuesta del asistente:\n"""${reply.slice(0, 2000)}"""\n\nDevuelve los hechos memorables.`,
        },
      ],
      responseFormat: 'json_object',
      temperature: 0,
      maxOutputTokens: 600,
    });

    let parsed: { facts?: unknown };
    try {
      parsed = JSON.parse(response.text) as { facts?: unknown };
    } catch {
      return {
        candidates: 0,
        inserted: 0,
        skippedDuplicates: 0,
        skippedInvalid: 0,
        latencyMs: Date.now() - start,
        error: 'invalid_llm_json',
      };
    }

    const rawFacts = Array.isArray(parsed.facts) ? parsed.facts : [];
    candidates = rawFacts
      .filter((f): f is { fact: unknown; factType: unknown } => !!f && typeof f === 'object')
      .map((f) => ({
        fact: typeof f.fact === 'string' ? f.fact.trim() : '',
        factType: (typeof f.factType === 'string' ? f.factType : 'other') as FactType,
      }))
      .filter((f) => f.fact.length >= 8 && f.fact.length <= 500 && FACT_TYPES.includes(f.factType))
      .slice(0, MAX_FACTS_PER_TURN);
  } catch (err) {
    return {
      candidates: 0,
      inserted: 0,
      skippedDuplicates: 0,
      skippedInvalid: 0,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (candidates.length === 0) {
    return {
      candidates: 0,
      inserted: 0,
      skippedDuplicates: 0,
      skippedInvalid: 0,
      latencyMs: Date.now() - start,
    };
  }

  let inserted = 0;
  let skippedDuplicates = 0;
  let skippedInvalid = 0;

  for (const cand of candidates) {
    try {
      const existing = await retrieveRelevantFacts({
        tenantId: input.tenantId,
        queryText: cand.fact,
        topK: 1,
        minSimilarity: DEDUP_SIMILARITY,
      });
      if (existing.length > 0) {
        skippedDuplicates++;
        continue;
      }
      await storeMemoryFact({
        tenantId: input.tenantId,
        userId: input.userId,
        conversationId: input.conversationId ?? null,
        fact: cand.fact,
        factType: cand.factType,
        // Reusamos 'tool_result' como source — semánticamente lo más
        // cercano a "extraído por proceso interno" sin tener que migrar
        // el check constraint si lo hubiera.
        source: 'tool_result',
        confidence: 0.75,
      });
      inserted++;
    } catch {
      skippedInvalid++;
    }
  }

  return {
    candidates: candidates.length,
    inserted,
    skippedDuplicates,
    skippedInvalid,
    latencyMs: Date.now() - start,
  };
}
