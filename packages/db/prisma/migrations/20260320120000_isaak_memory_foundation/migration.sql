CREATE TABLE IF NOT EXISTS "isaak_conversation_summaries" (
  "conversation_id" UUID PRIMARY KEY,
  "summary" TEXT NOT NULL,
  "open_loops_json" JSONB,
  "user_preferences_json" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "isaak_conversation_summaries_conversation_id_fkey"
    FOREIGN KEY ("conversation_id")
    REFERENCES "isaak_conversations"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "isaak_memory_facts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" TEXT,
  "conversation_id" UUID,
  "scope" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "fact_key" TEXT NOT NULL,
  "value_json" JSONB NOT NULL,
  "source" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION,
  "last_confirmed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "isaak_memory_facts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "tenants"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT "isaak_memory_facts_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT "isaak_memory_facts_conversation_id_fkey"
    FOREIGN KEY ("conversation_id")
    REFERENCES "isaak_conversations"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "isaak_memory_facts_tenant_category_created_at_idx"
  ON "isaak_memory_facts"("tenant_id", "category", "created_at");

CREATE INDEX IF NOT EXISTS "isaak_memory_facts_tenant_scope_created_at_idx"
  ON "isaak_memory_facts"("tenant_id", "scope", "created_at");

CREATE INDEX IF NOT EXISTS "isaak_memory_facts_user_created_at_idx"
  ON "isaak_memory_facts"("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "isaak_memory_facts_conversation_created_at_idx"
  ON "isaak_memory_facts"("conversation_id", "created_at");
