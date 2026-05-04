-- CreateTable
CREATE TABLE "isaak_push_subscriptions" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "isaak_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "isaak_push_subscriptions_endpoint_key" ON "isaak_push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "isaak_push_subscriptions_tenant_id_idx" ON "isaak_push_subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "isaak_push_subscriptions_user_id_idx" ON "isaak_push_subscriptions"("user_id");

-- AddForeignKey
ALTER TABLE "isaak_push_subscriptions" ADD CONSTRAINT "isaak_push_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
