-- CreateTable: isaak_platform_keys
CREATE TABLE "isaak_platform_keys" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT '{}',
    "rate_limit" INTEGER NOT NULL DEFAULT 1000,
    "last_used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "isaak_platform_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: isaak_api_audit_logs
CREATE TABLE "isaak_api_audit_logs" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" TEXT,
    "key_id" TEXT,
    "channel" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "tool_or_action" TEXT,
    "status" INTEGER NOT NULL,
    "duration_ms" INTEGER,
    "risk_level" TEXT,
    "confirmation_required" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "isaak_api_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: isaak_webhook_endpoints
CREATE TABLE "isaak_webhook_endpoints" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[] NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "isaak_webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable: isaak_proposed_actions
CREATE TABLE "isaak_proposed_actions" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "proposed_by" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL,
    "reason" TEXT,
    "risk_level" TEXT NOT NULL DEFAULT 'medium',
    "expires_at" TIMESTAMPTZ,
    "executed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "isaak_proposed_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "isaak_platform_keys_key_hash_key" ON "isaak_platform_keys"("key_hash");
CREATE UNIQUE INDEX "isaak_platform_keys_tenant_id_name_key" ON "isaak_platform_keys"("tenant_id", "name");
CREATE INDEX "isaak_platform_keys_tenant_id_idx" ON "isaak_platform_keys"("tenant_id");

CREATE INDEX "isaak_api_audit_logs_tenant_id_created_at_idx" ON "isaak_api_audit_logs"("tenant_id", "created_at");
CREATE INDEX "isaak_api_audit_logs_request_id_idx" ON "isaak_api_audit_logs"("request_id");

CREATE INDEX "isaak_webhook_endpoints_tenant_id_idx" ON "isaak_webhook_endpoints"("tenant_id");

-- AddForeignKey
ALTER TABLE "isaak_platform_keys"
    ADD CONSTRAINT "isaak_platform_keys_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "isaak_api_audit_logs"
    ADD CONSTRAINT "isaak_api_audit_logs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "isaak_api_audit_logs"
    ADD CONSTRAINT "isaak_api_audit_logs_key_id_fkey"
    FOREIGN KEY ("key_id") REFERENCES "isaak_platform_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "isaak_webhook_endpoints"
    ADD CONSTRAINT "isaak_webhook_endpoints_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "isaak_proposed_actions"
    ADD CONSTRAINT "isaak_proposed_actions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "isaak_proposed_actions_tenant_id_status_idx" ON "isaak_proposed_actions"("tenant_id", "status");
CREATE INDEX "isaak_proposed_actions_tenant_id_created_at_idx" ON "isaak_proposed_actions"("tenant_id", "created_at");
