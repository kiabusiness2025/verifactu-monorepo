-- CreateTable
CREATE TABLE "connector_health_checks" (
    "id" TEXT NOT NULL,
    "connector" VARCHAR(32) NOT NULL,
    "check_type" VARCHAR(64) NOT NULL,
    "target" TEXT NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "http_status" INTEGER,
    "error_code" VARCHAR(64),
    "error_message" TEXT,
    "metadata" JSONB,
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connector_health_checks_connector_check_type_checked_at_idx" ON "connector_health_checks"("connector", "check_type", "checked_at" DESC);

-- CreateIndex
CREATE INDEX "connector_health_checks_checked_at_idx" ON "connector_health_checks"("checked_at" DESC);
