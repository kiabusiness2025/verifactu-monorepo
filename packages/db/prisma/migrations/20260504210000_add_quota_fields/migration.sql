-- AlterTable: add connector quota tracking fields to tenant_subscriptions
ALTER TABLE "tenant_subscriptions"
  ADD COLUMN "queries_used_today" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "daily_query_limit"  INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "last_query_reset_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
