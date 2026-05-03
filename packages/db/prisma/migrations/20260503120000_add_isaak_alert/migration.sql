-- CreateEnum
CREATE TYPE "isaak_alert_status" AS ENUM ('pending', 'sent', 'read', 'dismissed');

-- CreateEnum
CREATE TYPE "isaak_alert_channel" AS ENUM ('email', 'push', 'in_app');

-- CreateTable
CREATE TABLE "isaak_alerts" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "due_date" TIMESTAMPTZ,
    "channel" "isaak_alert_channel" NOT NULL DEFAULT 'email',
    "status" "isaak_alert_status" NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "isaak_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "isaak_alerts_tenant_id_idx" ON "isaak_alerts"("tenant_id");

-- CreateIndex
CREATE INDEX "isaak_alerts_status_idx" ON "isaak_alerts"("status");

-- CreateIndex
CREATE INDEX "isaak_alerts_due_date_idx" ON "isaak_alerts"("due_date");

-- AddForeignKey
ALTER TABLE "isaak_alerts" ADD CONSTRAINT "isaak_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
