-- F3 Multi-provider router: capture classifier routing metadata per message.

ALTER TABLE "isaak_chat_metrics"
  ADD COLUMN "classifier_model"      TEXT,
  ADD COLUMN "classifier_latency_ms" INTEGER,
  ADD COLUMN "routed_to"             TEXT,
  ADD COLUMN "ambiguity_type"        TEXT;

CREATE INDEX "isaak_chat_metrics_routed_to_created_idx"
  ON "isaak_chat_metrics" ("routed_to", "created_at");
