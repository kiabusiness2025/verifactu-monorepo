-- F6b RAG retrieval: capture how many long-term-memory facts were injected
-- into the system prompt and how relevant the top match was. Lets us track
-- whether the chat actually uses retrieved memory or it just runs blind.

ALTER TABLE "isaak_chat_metrics"
  ADD COLUMN "facts_retrieved"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "rag_latency_ms"      INTEGER,
  ADD COLUMN "rag_top_similarity"  DOUBLE PRECISION;
