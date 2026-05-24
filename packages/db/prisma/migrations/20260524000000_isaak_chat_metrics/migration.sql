-- F1 Foundation: per-message metrics for Isaak chat
-- Captures tokens, latency, cost, and intelligence signals (clarification, fallback, history depth).
-- Baseline instrument before changing prompts/loop behaviour.

CREATE TABLE "isaak_chat_metrics" (
  "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           UUID,
  "user_id"             TEXT,
  "conversation_id"     UUID,
  "message_id"          UUID,

  "provider"            TEXT NOT NULL,
  "model_used"          TEXT NOT NULL,
  "feature"             TEXT,

  "input_tokens"        INTEGER NOT NULL DEFAULT 0,
  "output_tokens"       INTEGER NOT NULL DEFAULT 0,
  "estimated_cost_eur"  DECIMAL(12, 8) NOT NULL DEFAULT 0,

  "latency_ms"          INTEGER NOT NULL DEFAULT 0,
  "first_token_ms"      INTEGER,

  "tool_calls_count"    INTEGER NOT NULL DEFAULT 0,
  "tool_names"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  "is_clarification"    BOOLEAN NOT NULL DEFAULT FALSE,
  "is_fallback"         BOOLEAN NOT NULL DEFAULT FALSE,
  "history_turns"       INTEGER NOT NULL DEFAULT 0,

  "error_code"          TEXT,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "isaak_chat_metrics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "isaak_chat_metrics_tenant_created_idx"
  ON "isaak_chat_metrics" ("tenant_id", "created_at");

CREATE INDEX "isaak_chat_metrics_conversation_created_idx"
  ON "isaak_chat_metrics" ("conversation_id", "created_at");

CREATE INDEX "isaak_chat_metrics_model_created_idx"
  ON "isaak_chat_metrics" ("model_used", "created_at");
