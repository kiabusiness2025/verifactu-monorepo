-- D1: Outbound webhook delivery tracking.
-- Stores each delivery attempt per endpoint so failed deliveries can be
-- retried by the webhook-retry cron with exponential backoff.

CREATE TABLE "isaak_webhook_deliveries" (
    "id"               TEXT         NOT NULL,
    "endpoint_id"      TEXT         NOT NULL,
    "tenant_id"        UUID         NOT NULL,
    "event_type"       TEXT         NOT NULL,
    "payload"          JSONB        NOT NULL,
    "status"           TEXT         NOT NULL DEFAULT 'pending',
    "attempts"         INTEGER      NOT NULL DEFAULT 0,
    "next_retry_at"    TIMESTAMPTZ,
    "last_status_code" INTEGER,
    "last_error"       TEXT,
    "delivered_at"     TIMESTAMPTZ,
    "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "isaak_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "isaak_webhook_deliveries"
    ADD CONSTRAINT "isaak_webhook_deliveries_endpoint_id_fkey"
    FOREIGN KEY ("endpoint_id")
    REFERENCES "isaak_webhook_endpoints"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "isaak_webhook_deliveries_tenant_id_status_next_retry_at_idx"
    ON "isaak_webhook_deliveries"("tenant_id", "status", "next_retry_at");

CREATE INDEX "isaak_webhook_deliveries_endpoint_id_idx"
    ON "isaak_webhook_deliveries"("endpoint_id");
