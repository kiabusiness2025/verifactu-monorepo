// F13 Inspector AEAT Capa 3 — pure SQL builders for the corpus.
//
// Mantenidos como pure strings/functions para que los tests pinen el
// shape de la query sin tocar Prisma. La búsqueda NO filtra por tenant
// (el corpus es público); en cambio puede filtrar por source_type para
// que el sub-agente Inspector pregunte solo a la sección normativa
// relevante (BOE, INFORMA, etc.).

import type { AeatSourceType } from './aeat-corpus-sources';

export type SearchCorpusOptions = {
  sourceTypes?: AeatSourceType[];
};

// Returns the SQL WHERE clause for a corpus search. The first parameter
// is always the query embedding (positional $1). Optional filters bind
// to $2 onwards if present.
export function buildCorpusWhereClause(opts: SearchCorpusOptions): {
  whereClause: string;
  // 1-based parameter offset just AFTER the embedding param.
  nextParamIndex: number;
} {
  const conditions: string[] = ['embedding IS NOT NULL'];
  let nextParam = 2;
  if (opts.sourceTypes && opts.sourceTypes.length > 0) {
    conditions.push(`source_type = ANY($${nextParam}::text[])`);
    nextParam += 1;
  }
  return {
    whereClause: `WHERE ${conditions.join(' AND ')}`,
    nextParamIndex: nextParam,
  };
}

// Full SELECT for the RAG retriever. Returns chunks ranked by cosine
// distance ASC (smaller distance = more similar). The application
// converts distance → similarity in [0..1].
export function buildSearchCorpusSQL(opts: SearchCorpusOptions): string {
  const { whereClause, nextParamIndex } = buildCorpusWhereClause(opts);
  return `
    SELECT
      id,
      source_id    AS "sourceId",
      source_type  AS "sourceType",
      source_url   AS "sourceUrl",
      article_ref  AS "articleRef",
      title,
      content,
      chunk_index  AS "chunkIndex",
      ingested_at  AS "ingestedAt",
      1 - (embedding <=> $1::vector) / 2 AS similarity
    FROM isaak_aeat_corpus
    ${whereClause}
    ORDER BY embedding <=> $1::vector ASC
    LIMIT $${nextParamIndex}::int
  `.trim();
}

// Counts how many chunks exist per source — used by health checks and
// admin UI to know if the corpus is "warm" or empty after a deploy.
export const COUNT_BY_SOURCE_SQL = `
  SELECT
    source_id   AS "sourceId",
    source_type AS "sourceType",
    COUNT(*)::int AS "chunkCount",
    MAX(ingested_at) AS "lastIngestedAt"
  FROM isaak_aeat_corpus
  GROUP BY source_id, source_type
  ORDER BY source_id
`.trim();

// Upsert por (source_id, chunk_index). Permite re-ingestar una fuente
// sobreescribiendo sin duplicar — el unique constraint
// (source_id, chunk_index) hace de clave natural.
export const UPSERT_CHUNK_SQL = `
  INSERT INTO isaak_aeat_corpus (
    source_id, source_type, source_url, article_ref,
    title, content, embedding, chunk_index, token_count
  ) VALUES (
    $1, $2, $3, $4,
    $5, $6, $7::vector, $8::int, $9::int
  )
  ON CONFLICT (source_id, chunk_index) DO UPDATE
    SET source_type = EXCLUDED.source_type,
        source_url  = EXCLUDED.source_url,
        article_ref = EXCLUDED.article_ref,
        title       = EXCLUDED.title,
        content     = EXCLUDED.content,
        embedding   = EXCLUDED.embedding,
        token_count = EXCLUDED.token_count,
        updated_at  = NOW()
  RETURNING id
`.trim();

// Truncates a full source (used before a full re-ingestion when chunk
// boundaries shift due to source restructuring). Caller must coordinate
// with the ingestion pipeline.
export const DELETE_BY_SOURCE_SQL = `
  DELETE FROM isaak_aeat_corpus
  WHERE source_id = $1
`.trim();
