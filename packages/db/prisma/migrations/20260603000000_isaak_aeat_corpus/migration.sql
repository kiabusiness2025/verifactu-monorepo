-- F13 Inspector AEAT Capa 3 — corpus RAG.
--
-- Cuerpo público de normativa y doctrina fiscal española. A diferencia
-- de isaak_long_term_memory (por-cliente, aislado por tenant_id), este
-- corpus es compartido: cualquier tenant puede consultar las mismas
-- citas porque la normativa es pública.
--
-- El pipeline de ingesta (F13 fase 2) puebla esta tabla a partir de:
--   * Manual IRPF AEAT (PDF anual)
--   * Manual IVA AEAT (PDF anual)
--   * INFORMA (base oficial de consultas vinculantes DGT)
--   * BOE textos refundidos: LIVA, LIRPF, LIS, LGT, Reglamentos
--   * FAQs y manuales de la sede electrónica AEAT por modelo
--
-- pgvector debe existir (creado por la migración F6 de long-term memory).

CREATE TABLE "isaak_aeat_corpus" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),

  "source_id"    TEXT NOT NULL,
  "source_type"  TEXT NOT NULL,
  "source_url"   TEXT NOT NULL,
  "article_ref"  TEXT,

  "title"        TEXT,
  "content"      TEXT NOT NULL,
  "embedding"    vector(1536),

  "chunk_index"  INTEGER NOT NULL,
  "token_count"  INTEGER NOT NULL DEFAULT 0,

  "ingested_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "isaak_aeat_corpus_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "isaak_aeat_corpus_source_chunk_unique"
    UNIQUE ("source_id", "chunk_index"),
  CONSTRAINT "isaak_aeat_corpus_source_type_check"
    CHECK ("source_type" IN (
      'manual_aeat', 'boe', 'informa', 'sede_faq', 'doctrina_dgt'
    ))
);

CREATE INDEX "isaak_aeat_corpus_type_idx"
  ON "isaak_aeat_corpus" ("source_type");

CREATE INDEX "isaak_aeat_corpus_source_idx"
  ON "isaak_aeat_corpus" ("source_id");

CREATE INDEX "isaak_aeat_corpus_ingested_idx"
  ON "isaak_aeat_corpus" ("ingested_at" DESC);

-- HNSW index for cosine similarity. Partial index on rows that have an
-- embedding (rows in flight during ingestion may have NULL).
CREATE INDEX "isaak_aeat_corpus_embedding_idx"
  ON "isaak_aeat_corpus"
  USING hnsw ("embedding" vector_cosine_ops)
  WHERE "embedding" IS NOT NULL;
