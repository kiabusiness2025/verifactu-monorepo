-- F7 Few-shot retrieval metrics per chat message.

ALTER TABLE "isaak_chat_metrics"
  ADD COLUMN "few_shot_injected"       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "few_shot_latency_ms"     INTEGER,
  ADD COLUMN "few_shot_top_similarity" DOUBLE PRECISION;
