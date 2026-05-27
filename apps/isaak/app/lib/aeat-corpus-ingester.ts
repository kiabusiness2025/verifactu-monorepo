// R2 — Orquestador de ingesta de fuentes AEAT/BOE al corpus RAG.
//
// Flujo por fuente:
//   1. Resuelve URL desde sources registry (sourceId → AeatSource)
//   2. Fetch del contenido (HTML o PDF binary)
//   3. Extracción de texto plano (HTML stripper o pdfExtractor inyectable)
//   4. Chunker semántico (~500 tokens con overlap)
//   5. Embedding de cada chunk via OpenAI text-embedding-3-small
//   6. UPSERT en isaak_aeat_corpus por (source_id, chunk_index)
//
// Idempotente: re-ingestar la misma fuente sobrescribe los chunks por
// índice (no genera duplicados). Si los chunks cambian de tamaño, los
// indexes antiguos quedan obsoletos — se eliminan al inicio de cada
// ingesta para fuentes que reportan `replaceAll: true`.

import { prisma } from './prisma';
import { embedText, vectorToPgLiteral } from './isaak-embeddings';
import { chunkText, type TextChunk } from './aeat-corpus-chunker';
import { DELETE_BY_SOURCE_SQL, UPSERT_CHUNK_SQL } from './aeat-corpus-sql';
import { findSourceById, type AeatSource } from './aeat-corpus-sources';
import {
  extractTextFromHtml,
  makeNoopPdfExtractor,
  normalizeExtractedText,
  type PdfTextExtractor,
} from './aeat-corpus-extractors';

export type IngestSourceInput = {
  sourceId: string;
  // Si true, borra todos los chunks de la fuente antes de re-ingestar
  // (útil cuando el chunking cambió de tamaño/overlap y los índices
  // antiguos no corresponden con los nuevos).
  replaceAll?: boolean;
  // Inyectables para tests + para pasar implementación PDF real en prod
  fetchFn?: typeof fetch;
  pdfExtractor?: PdfTextExtractor;
  // Cap defensivo: cuántos chunks ingerir máximo por fuente en una run.
  maxChunks?: number;
};

export type IngestSourceResult = {
  ok: boolean;
  sourceId: string;
  sourceType: string;
  chunksExtracted: number;
  chunksEmbedded: number;
  chunksUpserted: number;
  bytesFetched: number;
  totalTokens: number;
  durationMs: number;
  errors: Array<{ stage: string; message: string; chunkIndex?: number }>;
};

const DEFAULT_MAX_CHUNKS = 500;

export async function ingestSource(input: IngestSourceInput): Promise<IngestSourceResult> {
  const start = Date.now();
  const source = findSourceById(input.sourceId);
  if (!source) {
    return makeErrorResult(input.sourceId, '', 'lookup', `Unknown source id: ${input.sourceId}`, start);
  }

  const fetcher = input.fetchFn ?? fetch;
  const pdfExtractor = input.pdfExtractor ?? makeNoopPdfExtractor();
  const maxChunks = Math.max(1, Math.min(2000, input.maxChunks ?? DEFAULT_MAX_CHUNKS));

  // ─── 1+2: fetch ───────────────────────────────────────────────────
  let bodyBuffer: ArrayBuffer;
  let contentType: string;
  try {
    const res = await fetcher(source.url, {
      headers: { 'User-Agent': 'IsaakBot/1.0 (+https://isaak.app)' },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      return makeErrorResult(source.id, source.type, 'fetch', `HTTP ${res.status} ${res.statusText}`, start);
    }
    contentType = res.headers.get('content-type') ?? '';
    bodyBuffer = await res.arrayBuffer();
  } catch (err) {
    return makeErrorResult(
      source.id,
      source.type,
      'fetch',
      err instanceof Error ? err.message : String(err),
      start,
    );
  }

  // ─── 3: extract text ───────────────────────────────────────────────
  let rawText: string;
  try {
    if (source.fetcher === 'pdf') {
      const result = await pdfExtractor(new Uint8Array(bodyBuffer));
      rawText = result.text;
    } else {
      // html / sitemap / api default a HTML stripping
      const html = new TextDecoder('utf-8').decode(bodyBuffer);
      rawText = extractTextFromHtml(html).text;
    }
    rawText = normalizeExtractedText(rawText);
  } catch (err) {
    return makeErrorResult(
      source.id,
      source.type,
      'extract',
      err instanceof Error ? err.message : String(err),
      start,
    );
  }

  if (!rawText.trim()) {
    return makeErrorResult(source.id, source.type, 'extract', 'empty_text_after_extract', start);
  }

  // ─── 4: chunk ─────────────────────────────────────────────────────
  const chunks = chunkText(rawText);
  const limited = chunks.slice(0, maxChunks);

  // ─── 5+6: embed + upsert por chunk ───────────────────────────────
  const errors: IngestSourceResult['errors'] = [];
  let embedded = 0;
  let upserted = 0;
  let totalTokens = 0;

  if (input.replaceAll) {
    try {
      await prisma.$queryRawUnsafe(DELETE_BY_SOURCE_SQL, source.id);
    } catch (err) {
      errors.push({
        stage: 'delete_existing',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (const chunk of limited) {
    let vector: number[];
    let tokens: number;
    try {
      const result = await embedText(chunk.content);
      vector = result.vector;
      tokens = result.tokens;
      totalTokens += tokens;
      embedded += 1;
    } catch (err) {
      errors.push({
        stage: 'embed',
        message: err instanceof Error ? err.message : String(err),
        chunkIndex: chunk.index,
      });
      continue;
    }

    try {
      await upsertChunk({
        sourceId: source.id,
        sourceType: source.type,
        sourceUrl: source.url,
        articleRef: extractArticleRefHeuristic(chunk),
        title: chunk.title ?? null,
        content: chunk.content,
        embedding: vector,
        chunkIndex: chunk.index,
        tokenCount: chunk.estimatedTokens,
      });
      upserted += 1;
    } catch (err) {
      errors.push({
        stage: 'upsert',
        message: err instanceof Error ? err.message : String(err),
        chunkIndex: chunk.index,
      });
    }
  }

  return {
    ok: errors.length === 0,
    sourceId: source.id,
    sourceType: source.type,
    chunksExtracted: chunks.length,
    chunksEmbedded: embedded,
    chunksUpserted: upserted,
    bytesFetched: bodyBuffer.byteLength,
    totalTokens,
    durationMs: Date.now() - start,
    errors,
  };
}

// ─── helpers internos ─────────────────────────────────────────────────

async function upsertChunk(args: {
  sourceId: string;
  sourceType: string;
  sourceUrl: string;
  articleRef: string | null;
  title: string | null;
  content: string;
  embedding: number[];
  chunkIndex: number;
  tokenCount: number;
}): Promise<void> {
  await prisma.$queryRawUnsafe(
    UPSERT_CHUNK_SQL,
    args.sourceId,
    args.sourceType,
    args.sourceUrl,
    args.articleRef,
    args.title,
    args.content,
    vectorToPgLiteral(args.embedding),
    args.chunkIndex,
    args.tokenCount,
  );
}

// Heurística para BOE consolidados y manuales AEAT: si el título o
// primeras líneas del chunk contienen "Artículo NN", lo capturamos como
// referencia normativa. Si no, null.
export function extractArticleRefHeuristic(chunk: TextChunk): string | null {
  const lookIn = chunk.title ? `${chunk.title}\n${chunk.content.slice(0, 200)}` : chunk.content.slice(0, 200);
  const articleMatch = lookIn.match(/Art[íi]culo\s+(\d+(?:[\.\-][\.\w]+)?)/i);
  if (articleMatch) return `Art. ${articleMatch[1]}`;
  const epigrafeMatch = lookIn.match(/Epígrafe\s+([\d\.\-]+)/i);
  if (epigrafeMatch) return `Epígrafe ${epigrafeMatch[1]}`;
  return null;
}

function makeErrorResult(
  sourceId: string,
  sourceType: string,
  stage: string,
  message: string,
  start: number,
): IngestSourceResult {
  return {
    ok: false,
    sourceId,
    sourceType,
    chunksExtracted: 0,
    chunksEmbedded: 0,
    chunksUpserted: 0,
    bytesFetched: 0,
    totalTokens: 0,
    durationMs: Date.now() - start,
    errors: [{ stage, message }],
  };
}

// ─── Ingest masivo (cron quarterly) ──────────────────────────────────

export type IngestAllInput = {
  // Filtra por tipo de fuente. Si se omite, ingesta todo lo del
  // registry (caro: el ingester ejecuta secuencialmente).
  sourceTypes?: Array<AeatSource['type']>;
  fetchFn?: typeof fetch;
  pdfExtractor?: PdfTextExtractor;
  replaceAll?: boolean;
};

export type IngestAllResult = {
  totalSources: number;
  succeeded: number;
  failed: number;
  totalChunksUpserted: number;
  totalTokens: number;
  perSource: IngestSourceResult[];
};

import { AEAT_SOURCES } from './aeat-corpus-sources';

export async function ingestAllSources(input: IngestAllInput = {}): Promise<IngestAllResult> {
  const filtered = input.sourceTypes
    ? AEAT_SOURCES.filter((s) => input.sourceTypes!.includes(s.type))
    : AEAT_SOURCES;

  const perSource: IngestSourceResult[] = [];
  let succeeded = 0;
  let failed = 0;
  let totalChunks = 0;
  let totalTokens = 0;

  for (const source of filtered) {
    const r = await ingestSource({
      sourceId: source.id,
      fetchFn: input.fetchFn,
      pdfExtractor: input.pdfExtractor,
      replaceAll: input.replaceAll,
    });
    perSource.push(r);
    if (r.ok) succeeded += 1;
    else failed += 1;
    totalChunks += r.chunksUpserted;
    totalTokens += r.totalTokens;
  }

  return {
    totalSources: filtered.length,
    succeeded,
    failed,
    totalChunksUpserted: totalChunks,
    totalTokens,
    perSource,
  };
}
