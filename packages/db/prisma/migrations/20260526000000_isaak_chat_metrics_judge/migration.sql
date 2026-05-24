-- F4 Judge model: capture write-attempt validation per message.

ALTER TABLE "isaak_chat_metrics"
  ADD COLUMN "judge_invocations" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "judge_blocks"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "judge_latency_ms"  INTEGER,
  ADD COLUMN "write_tools"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
