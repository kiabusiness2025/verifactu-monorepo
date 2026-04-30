-- CreateTable
CREATE TABLE "isaak_google_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ,
    "email" TEXT,
    "scopes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "isaak_google_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "isaak_google_tokens_tenant_id_idx" ON "isaak_google_tokens"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "isaak_google_tokens_tenant_id_user_id_key" ON "isaak_google_tokens"("tenant_id", "user_id");

-- AddForeignKey
ALTER TABLE "isaak_google_tokens" ADD CONSTRAINT "isaak_google_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
