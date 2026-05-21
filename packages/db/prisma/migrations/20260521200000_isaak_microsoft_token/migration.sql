-- CreateTable
CREATE TABLE "isaak_microsoft_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ,
    "email" TEXT,
    "display_name" TEXT,
    "scopes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "isaak_microsoft_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "isaak_microsoft_tokens_tenant_id_user_id_key" ON "isaak_microsoft_tokens"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "isaak_microsoft_tokens_tenant_id_idx" ON "isaak_microsoft_tokens"("tenant_id");

-- AddForeignKey
ALTER TABLE "isaak_microsoft_tokens" ADD CONSTRAINT "isaak_microsoft_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
