-- CreateTable
CREATE TABLE "holded_mcp_personal_access_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "connection_id" UUID,
    "channel_key" TEXT NOT NULL DEFAULT 'chatgpt',
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "last_used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "holded_mcp_personal_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holded_mcp_pat_audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "pat_id" TEXT,
    "event" TEXT NOT NULL,
    "channel" TEXT,
    "tool_name" TEXT,
    "status" INTEGER,
    "ip" TEXT,
    "user_agent" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holded_mcp_pat_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "holded_mcp_personal_access_tokens_key_hash_key" ON "holded_mcp_personal_access_tokens"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "holded_mcp_personal_access_tokens_tenant_id_name_key" ON "holded_mcp_personal_access_tokens"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "holded_mcp_personal_access_tokens_tenant_id_channel_key_idx" ON "holded_mcp_personal_access_tokens"("tenant_id", "channel_key");

-- CreateIndex
CREATE INDEX "holded_mcp_personal_access_tokens_connection_id_idx" ON "holded_mcp_personal_access_tokens"("connection_id");

-- CreateIndex
CREATE INDEX "holded_mcp_pat_audit_logs_tenant_id_created_at_idx" ON "holded_mcp_pat_audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "holded_mcp_pat_audit_logs_pat_id_idx" ON "holded_mcp_pat_audit_logs"("pat_id");

-- AddForeignKey
ALTER TABLE "holded_mcp_personal_access_tokens" ADD CONSTRAINT "holded_mcp_personal_access_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holded_mcp_personal_access_tokens" ADD CONSTRAINT "holded_mcp_personal_access_tokens_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "external_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holded_mcp_pat_audit_logs" ADD CONSTRAINT "holded_mcp_pat_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holded_mcp_pat_audit_logs" ADD CONSTRAINT "holded_mcp_pat_audit_logs_pat_id_fkey" FOREIGN KEY ("pat_id") REFERENCES "holded_mcp_personal_access_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
