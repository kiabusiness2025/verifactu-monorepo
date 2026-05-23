-- Free tier: unlimited queries (dailyQueryLimit default -1 = unlimited)
-- Paid plans continue to use -1 (already set); this only touches existing free subscriptions
ALTER TABLE "tenant_subscriptions"
  ALTER COLUMN "daily_query_limit" SET DEFAULT -1;

-- Update all existing subscriptions that still have the old default (10)
-- to be unlimited, regardless of plan (paid plans already had -1)
UPDATE "tenant_subscriptions"
  SET "daily_query_limit" = -1
  WHERE "daily_query_limit" = 10;
