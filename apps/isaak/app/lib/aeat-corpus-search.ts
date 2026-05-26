// R3 — Búsqueda semántica del corpus AEAT.
//
// Embebe la query del usuario, ejecuta búsqueda cosine en pgvector y
// devuelve los top-K chunks con su contexto (sourceUrl, articleRef,
// title, similitud). El LLM que llama desde sub-agente Inspector
// formatea las citas para el usuario.

import { prisma } from './prisma';
import { embedText, vectorToPgLiteral } from './isaak-embeddings';
import { buildSearchCorpusSQL } from './aeat-corpus-sql';
import type { AeatSourceType } from './aeat-corpus-sources';

export type SearchAeatCorpusInput = {
  query: string;
  sourceTypes?: AeatSourceType[];
  topK?: number;
  minSimilarity?: number; // 0..1 floor
};

export type AeatCorpusHit = {
  id: string;
  sourceId: string;
  sourceType: string;
  sourceUrl: string;
  articleRef: string | null;
  title: string | null;
  content: string;
  chunkIndex: number;
  ingestedAt: string;
  similarity: number;
};

const DEFAULT_TOP_K = 5;
const TOP_K_MAX = 20;
const DEFAULT_MIN_SIMILARITY = 0.5;

export async function searchAeatCorpus(
  input: SearchAeatCorpusInput,
): Promise<AeatCorpusHit[]> {
  const query = input.query?.trim();
  if (!query) return [];

  const topK = Math.max(1, Math.min(TOP_K_MAX, input.topK ?? DEFAULT_TOP_K));
  const minSim = Math.max(0, Math.min(1, input.minSimilarity ?? DEFAULT_MIN_SIMILARITY));

  // 1. Embed query
  const embedding = await embedText(query);
  const literal = vectorToPgLiteral(embedding.vector);

  // 2. Build SQL + params
  const opts = { sourceTypes: input.sourceTypes };
  const sql = buildSearchCorpusSQL(opts);
  const params: unknown[] = [literal];
  if (input.sourceTypes && input.sourceTypes.length > 0) {
    params.push(input.sourceTypes);
  }
  params.push(topK);

  // 3. Run
  type Row = {
    id: string;
    sourceId: string;
    sourceType: string;
    sourceUrl: string;
    articleRef: string | null;
    title: string | null;
    content: string;
    chunkIndex: number;
    ingestedAt: Date;
    similarity: number;
  };

  const rows = await prisma.$queryRawUnsafe<Row[]>(sql, ...params);

  return rows
    .map((r) => ({
      id: r.id,
      sourceId: r.sourceId,
      sourceType: r.sourceType,
      sourceUrl: r.sourceUrl,
      articleRef: r.articleRef,
      title: r.title,
      content: r.content,
      chunkIndex: r.chunkIndex,
      ingestedAt: r.ingestedAt.toISOString(),
      similarity: Number(r.similarity),
    }))
    .filter((h) => h.similarity >= minSim);
}

// ─── Health stats (admin UI / cron) ──────────────────────────────────

import { COUNT_BY_SOURCE_SQL } from './aeat-corpus-sql';

export type CorpusSourceStats = {
  sourceId: string;
  sourceType: string;
  chunkCount: number;
  lastIngestedAt: string | null;
};

export async function getCorpusStats(): Promise<CorpusSourceStats[]> {
  type Row = {
    sourceId: string;
    sourceType: string;
    chunkCount: number;
    lastIngestedAt: Date | null;
  };
  const rows = await prisma.$queryRawUnsafe<Row[]>(COUNT_BY_SOURCE_SQL);
  return rows.map((r) => ({
    sourceId: r.sourceId,
    sourceType: r.sourceType,
    chunkCount: r.chunkCount,
    lastIngestedAt: r.lastIngestedAt ? r.lastIngestedAt.toISOString() : null,
  }));
}
