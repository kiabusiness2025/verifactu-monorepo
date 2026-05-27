// F12 — Inspector AEAT Capa 2.
//
// Sub-agente fiscal contextual: combina las 3 capas para responder
// preguntas complejas con citas BOE.
//
// Capa 1 (F11): perfil fiscal del tenant + reglas hardcoded
// Capa 2 (F12, este módulo): orquestación LLM con RAG
// Capa 3 (R2/R3): corpus AEAT/BOE indexado en pgvector
//
// Diferencia con el sub-agente fiscal F8: aquí NO hay tool-call loop.
// Es UN SOLO turn de LLM con:
//   - System prompt enriquecido con perfil fiscal + reglas aplicables
//   - User message con la pregunta + top-K pasajes BOE
//   - Output esperado: respuesta en lenguaje natural con citas
//     numeradas [1], [2], etc. mapeadas a las fuentes del corpus
//
// Útil cuando el usuario pregunta "¿debo aplicar prorrata especial?",
// "¿qué retención IRPF aplicar a un alquiler?", "¿cuándo presento el
// 720?" — preguntas que requieren citar normativa específica, no solo
// dar la respuesta operativa.

import type { TaxpayerProfileSnapshot } from './inspector-aeat';
import type { AeatCorpusHit } from './aeat-corpus-search';

// ─── Input / Output ─────────────────────────────────────────────────────

export type InspectorConsultInput = {
  tenantId: string;
  query: string;
  // Si se pasa, se usa este perfil; si no, se carga desde DB.
  profile?: TaxpayerProfileSnapshot | null;
  // Top-K para el corpus search. Default 5.
  topK?: number;
  // Override del LLM caller (para tests).
  llmCaller?: LLMCaller;
  // Override del corpus searcher (para tests).
  corpusSearcher?: CorpusSearcher;
};

export type InspectorCitation = {
  index: number; // 1-based, según aparece en la respuesta
  sourceId: string;
  sourceUrl: string;
  articleRef: string | null;
  title: string | null;
  snippet: string;
  similarity: number;
};

export type InspectorConsultResult =
  | {
      ok: true;
      answer: string; // texto con citas [1], [2], ...
      citations: InspectorCitation[];
      profile: TaxpayerProfileSnapshot | null;
      corpusHits: number;
      model: string;
      latencyMs: number;
    }
  | {
      ok: false;
      error: 'invalid_input' | 'no_corpus_hits' | 'llm_failed';
      message: string;
    };

// ─── Inyección de dependencias para tests ──────────────────────────────

export type LLMCaller = (params: {
  instructions: string;
  inputText: string;
  temperature: number;
  maxOutputTokens: number;
}) => Promise<{ text: string; model: string; latencyMs?: number }>;

export type CorpusSearcher = (
  query: string,
  topK: number,
) => Promise<AeatCorpusHit[]>;

// ─── Builder del system prompt (puro) ──────────────────────────────────

export function buildInspectorPrompt(
  profile: TaxpayerProfileSnapshot | null,
): string {
  const lines: string[] = [
    `Eres el Inspector AEAT de Isaak — Capa 2. Tu rol es responder preguntas fiscales complejas con CITAS específicas a la normativa.`,
    ``,
    `PRINCIPIOS:`,
    `1. SIEMPRE cita la fuente con corchetes numerados [1], [2], etc. Cada cita debe mapear a uno de los pasajes BOE que recibirás en el mensaje.`,
    `2. Si el perfil fiscal del tenant es relevante para la respuesta, mencionalo explícitamente.`,
    `3. Si los pasajes BOE no cubren la pregunta, dilo claramente — NO inventes normativa. Sugiere consultar a un asesor.`,
    `4. Si la respuesta depende de detalles que no conoces (régimen, sector, importes), pregúntalos antes de responder.`,
    `5. Español claro, profesional. Vocabulario fiscal correcto. Sin tecnicismos innecesarios.`,
    `6. Cuando cites un plazo, indica el día concreto (ej. "20 de abril") no "trimestre siguiente".`,
    `7. Si la respuesta tiene aristas (excepciones, regímenes especiales), enúmeralas con bullet points.`,
    ``,
  ];

  if (profile) {
    lines.push(`PERFIL FISCAL DEL TENANT (úsalo para personalizar la respuesta):`);
    if (profile.taxpayerType) lines.push(`- Tipo contribuyente: ${profile.taxpayerType}`);
    if (profile.vatRegime) lines.push(`- Régimen IVA: ${profile.vatRegime}`);
    if (profile.territory) lines.push(`- Territorio fiscal: ${profile.territory}`);
    if (profile.sector) lines.push(`- Sector actividad: ${profile.sector}`);
    if (profile.corporateTaxSubject != null) {
      lines.push(`- Sujeto a Impuesto Sociedades: ${profile.corporateTaxSubject ? 'sí' : 'no'}`);
    }
    if (profile.hasEmployees != null) {
      lines.push(`- Tiene empleados: ${profile.hasEmployees ? 'sí' : 'no'}`);
    }
    if (profile.hasIntraEUOperations != null) {
      lines.push(`- Operaciones intracomunitarias: ${profile.hasIntraEUOperations ? 'sí' : 'no'}`);
    }
    lines.push(``);
  } else {
    lines.push(`PERFIL FISCAL: no configurado. Si la respuesta depende del régimen o del tipo de contribuyente, pregúntalo antes de responder.`);
    lines.push(``);
  }

  lines.push(`FORMATO DE RESPUESTA:`);
  lines.push(`1. Una respuesta directa a la pregunta en 2-6 frases.`);
  lines.push(`2. Si aplica, bullet points con excepciones o casos especiales.`);
  lines.push(`3. Bloque final "Fuentes:" con la lista de citas usadas, en formato:`);
  lines.push(`   [1] Título o artículo - Resumen breve (1 línea)`);
  lines.push(``);
  lines.push(`Las URLs canónicas no las escribes tú; el sistema las añade automáticamente al final basándose en los números de cita.`);

  return lines.join('\n');
}

// ─── Builder del user message (puro) ───────────────────────────────────

export function buildUserMessage(query: string, hits: AeatCorpusHit[]): string {
  const passages = hits
    .map((h, i) => {
      const num = i + 1;
      const header = h.articleRef
        ? `[${num}] ${h.articleRef}${h.title ? ` — ${h.title}` : ''}`
        : `[${num}] ${h.title ?? 'Pasaje'}`;
      return `${header}\n${h.content.trim()}`;
    })
    .join('\n\n---\n\n');

  return `PREGUNTA DEL USUARIO:
${query}

PASAJES BOE / DOCTRINA AEAT RELEVANTES (top-${hits.length}):

${passages}

Responde usando ÚNICAMENTE estos pasajes como fuente normativa. Cita con [1], [2], etc. Si los pasajes no cubren la pregunta, dilo y sugiere consultar a un asesor.`;
}

// ─── Parser de la respuesta del LLM (puro) ─────────────────────────────

// Extrae los números de cita usados en el texto. Soporta [1], [1,2],
// [1, 2], [1][2], etc. Devuelve los números únicos ordenados.
export function extractCitedNumbers(text: string): number[] {
  const seen = new Set<number>();
  const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    for (const part of (m[1] ?? '').split(',')) {
      const n = Number.parseInt(part.trim(), 10);
      if (Number.isFinite(n) && n > 0) seen.add(n);
    }
  }
  return Array.from(seen).sort((a, b) => a - b);
}

export function buildCitations(
  hits: AeatCorpusHit[],
  citedNumbers: number[],
): InspectorCitation[] {
  return citedNumbers
    .map((n) => {
      const h = hits[n - 1];
      if (!h) return null;
      return {
        index: n,
        sourceId: h.sourceId,
        sourceUrl: h.sourceUrl,
        articleRef: h.articleRef,
        title: h.title,
        snippet: h.content.slice(0, 240),
        similarity: h.similarity,
      };
    })
    .filter((c): c is InspectorCitation => c !== null);
}

// ─── Orchestrator (con dependencias inyectables) ───────────────────────

export async function consultInspector(
  input: InspectorConsultInput,
): Promise<InspectorConsultResult> {
  const query = input.query?.trim();
  if (!query) {
    return {
      ok: false,
      error: 'invalid_input',
      message: 'query es obligatorio.',
    };
  }
  if (!input.tenantId) {
    return {
      ok: false,
      error: 'invalid_input',
      message: 'tenantId es obligatorio.',
    };
  }

  // 1. Cargar perfil fiscal (Capa 1)
  let profile = input.profile;
  if (profile === undefined) {
    profile = await loadProfile(input.tenantId);
  }

  // 2. Buscar en corpus (Capa 3)
  const topK = input.topK ?? 5;
  const corpusSearcher = input.corpusSearcher ?? defaultCorpusSearcher;
  const hits = await corpusSearcher(query, topK);
  if (hits.length === 0) {
    return {
      ok: false,
      error: 'no_corpus_hits',
      message: 'No se encontraron pasajes BOE relevantes para la consulta. Verifica si el corpus AEAT está ingestado.',
    };
  }

  // 3. Llamar al LLM (Capa 2)
  const llmCaller = input.llmCaller ?? defaultLlmCaller;
  const instructions = buildInspectorPrompt(profile ?? null);
  const userMessage = buildUserMessage(query, hits);

  try {
    const result = await llmCaller({
      instructions,
      inputText: userMessage,
      temperature: 0.2,
      maxOutputTokens: 1200,
    });

    // 4. Parsear citas
    const citedNumbers = extractCitedNumbers(result.text);
    const citations = buildCitations(hits, citedNumbers);

    return {
      ok: true,
      answer: result.text,
      citations,
      profile: profile ?? null,
      corpusHits: hits.length,
      model: result.model,
      latencyMs: result.latencyMs ?? 0,
    };
  } catch (err) {
    return {
      ok: false,
      error: 'llm_failed',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Defaults (lazy imports para no tirar de @verifactu/utils en tests) ─

async function loadProfile(
  tenantId: string,
): Promise<TaxpayerProfileSnapshot | null> {
  const { getTaxpayerProfileAsSnapshot } = await import('./isaak-taxpayer-profile');
  return getTaxpayerProfileAsSnapshot(tenantId);
}

const defaultCorpusSearcher: CorpusSearcher = async (query, topK) => {
  const { searchAeatCorpus } = await import('./aeat-corpus-search');
  return searchAeatCorpus({ query, topK });
};

const defaultLlmCaller: LLMCaller = async ({
  instructions,
  inputText,
  temperature,
  maxOutputTokens,
}) => {
  const { callLLM } = await import('@verifactu/utils');
  const start = Date.now();
  const result = await callLLM({
    provider: 'anthropic',
    instructions,
    inputText,
    temperature,
    maxOutputTokens,
    feature: 'isaak_inspector_capa_2',
    enableFallback: true,
  });
  return {
    text: result.text,
    model: result.model,
    latencyMs: Date.now() - start,
  };
};
