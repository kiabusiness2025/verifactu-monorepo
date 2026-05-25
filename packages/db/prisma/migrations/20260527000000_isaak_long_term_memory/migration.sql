-- F6 Long-term memory: free-text facts with pgvector embeddings for RAG.
--
-- Sibling of isaak_memory_facts (which holds structured key-value facts).
-- Strict tenant isolation enforced at the query layer: every retrieve must
-- filter by tenant_id BEFORE running the similarity operator.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "isaak_long_term_memory" (
  "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       UUID NOT NULL,
  "user_id"         TEXT,
  "conversation_id" UUID,

  "fact"            TEXT NOT NULL,
  "fact_type"       TEXT NOT NULL,
  "embedding"       vector(1536),

  "source"          TEXT NOT NULL,
  "source_msg_id"   TEXT,
  "confidence"      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "expires_at"      TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "isaak_long_term_memory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "isaak_long_term_memory_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "isaak_long_term_memory_user_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "isaak_long_term_memory_tenant_idx"
  ON "isaak_long_term_memory" ("tenant_id");

CREATE INDEX "isaak_long_term_memory_tenant_type_idx"
  ON "isaak_long_term_memory" ("tenant_id", "fact_type");

CREATE INDEX "isaak_long_term_memory_tenant_expires_idx"
  ON "isaak_long_term_memory" ("tenant_id", "expires_at");

-- HNSW index on the embedding for cosine-distance nearest-neighbour search.
-- HNSW gives sub-linear lookup with high recall; suitable while the table
-- stays below ~10M rows. If it grows beyond that, switch to IVFFlat with
-- tuned lists, or move to a dedicated vector store.
CREATE INDEX "isaak_long_term_memory_embedding_hnsw_idx"
  ON "isaak_long_term_memory"
  USING hnsw (embedding vector_cosine_ops);
