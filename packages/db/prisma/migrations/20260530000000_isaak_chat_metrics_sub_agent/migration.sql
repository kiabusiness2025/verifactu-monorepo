-- F8 Sub-agents: track which specialist persona handled each message.
-- NULL means the orchestrator (default Sonnet path) handled it.

ALTER TABLE "isaak_chat_metrics"
  ADD COLUMN "sub_agent" TEXT;

CREATE INDEX "isaak_chat_metrics_sub_agent_created_idx"
  ON "isaak_chat_metrics" ("sub_agent", "created_at")
  WHERE "sub_agent" IS NOT NULL;
