-- D1 — outbound webhook delivery (HMAC-signed).
--
-- One row per (event × endpoint). The /api/cron/webhooks-dispatch cron
-- polls rows in status='pending' with nextAttemptAt <= now, signs the
-- payload, POSTs to the customer endpoint, and updates the row based on
-- the response. Retries follow exponential backoff (1m, 5m, 30m, 2h,
-- 12h, 24h); after 6 attempts the row moves to status='dead'.
--
-- eventId is the stable identifier surfaced to the client in payload.id
-- so they can deduplicate retries on their side (format: evt_<ts>_<rand8>).

CREATE TABLE "isaak_webhook_deliveries" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "endpoint_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ,
    "last_error" TEXT,
    "last_status_code" INTEGER,
    "last_response_body" VARCHAR(1024),
    "delivered_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "isaak_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "isaak_webhook_deliveries_status_next_attempt_at_idx"
    ON "isaak_webhook_deliveries"("status", "next_attempt_at");

CREATE INDEX "isaak_webhook_deliveries_tenant_id_event_type_idx"
    ON "isaak_webhook_deliveries"("tenant_id", "event_type");

ALTER TABLE "isaak_webhook_deliveries"
    ADD CONSTRAINT "isaak_webhook_deliveries_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "isaak_webhook_deliveries"
    ADD CONSTRAINT "isaak_webhook_deliveries_endpoint_id_fkey"
    FOREIGN KEY ("endpoint_id") REFERENCES "isaak_webhook_endpoints"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
