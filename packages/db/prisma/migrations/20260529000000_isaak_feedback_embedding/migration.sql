-- F7 Few-shot dynamic: extend isaak_feedback with embedding + eligibility flag.
--
-- The isaak_feedback table is created at runtime by /api/holded/feedback
-- (CREATE TABLE IF NOT EXISTS) and isn't tracked by Prisma. We make this
-- migration idempotent so it can run on any environment regardless of
-- whether the table was already initialized by the endpoint.

CREATE TABLE IF NOT EXISTS isaak_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key  TEXT NOT NULL DEFAULT 'admin',
  question    TEXT NOT NULL,
  response    TEXT NOT NULL,
  rating      TEXT NOT NULL CHECK (rating IN ('thumbs_up', 'thumbs_down')),
  tenant_id   UUID,
  context     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE isaak_feedback ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- pgvector extension is set up in the F6a migration; this is a no-op if
-- F6a already ran, but added here so F7 can be applied to environments
-- that skipped the long-term-memory migrations for some reason.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE isaak_feedback
  ADD COLUMN IF NOT EXISTS query_embedding   vector(1536),
  ADD COLUMN IF NOT EXISTS few_shot_eligible BOOLEAN NOT NULL DEFAULT FALSE;

-- Cosine-similarity index restricted to the few-shot pool. Partial index
-- keeps it small even if total feedback rows grow into the millions.
CREATE INDEX IF NOT EXISTS isaak_feedback_few_shot_embedding_idx
  ON isaak_feedback
  USING hnsw (query_embedding vector_cosine_ops)
  WHERE few_shot_eligible = TRUE;

-- Lookups by tenant for both feedback browsing and the eligible-pool query.
CREATE INDEX IF NOT EXISTS isaak_feedback_tenant_created_idx
  ON isaak_feedback (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS isaak_feedback_tenant_few_shot_idx
  ON isaak_feedback (tenant_id, few_shot_eligible);
