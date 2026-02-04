/*
  Warnings:

  - Added the required column `updated_at` to the `tenant_subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SUPPORT_SESSION_START';
ALTER TYPE "AuditAction" ADD VALUE 'SUPPORT_SESSION_END';
ALTER TYPE "AuditAction" ADD VALUE 'SUPPORT_IMPERSONATE';
ALTER TYPE "AuditAction" ADD VALUE 'TENANT_SUSPEND';
ALTER TYPE "AuditAction" ADD VALUE 'TENANT_ACTIVATE';

-- AlterTable
ALTER TABLE "tenant_profiles" ADD COLUMN     "einforma_last_sync_at" TIMESTAMPTZ,
ADD COLUMN     "einforma_raw" JSONB,
ADD COLUMN     "einforma_tax_id_verified" BOOLEAN;

-- AlterTable
ALTER TABLE "tenant_subscriptions" ADD COLUMN     "cancel_at_period_end" BOOLEAN DEFAULT false,
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_price_id" TEXT,
ADD COLUMN     "stripe_status" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;

-- CreateTable
CREATE TABLE "einforma_lookups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query_type" TEXT NOT NULL,
    "query_value" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "normalized" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "einforma_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "ip" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "support_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "einforma_lookups_expires_at_idx" ON "einforma_lookups"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "einforma_lookups_query_type_query_value_key" ON "einforma_lookups"("query_type", "query_value");

-- CreateIndex
CREATE INDEX "support_sessions_tenant_id_started_at_idx" ON "support_sessions"("tenant_id", "started_at");

-- CreateIndex
CREATE INDEX "support_sessions_user_id_started_at_idx" ON "support_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "support_sessions_admin_id_started_at_idx" ON "support_sessions"("admin_id", "started_at");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_stripe_customer_id_idx" ON "tenant_subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_stripe_subscription_id_idx" ON "tenant_subscriptions"("stripe_subscription_id");

-- AddForeignKey
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_sessions" ADD CONSTRAINT "support_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
