-- Migration: erp_oauth_tokens
-- Stores OAuth access + refresh tokens (AES-256-GCM encrypted) for ERP providers
-- that use OAuth 2.0: Sage 200c, a3innuva. Holded continues using api_key_enc on
-- external_connections and does not use this table.

CREATE TABLE "erp_oauth_tokens" (
    "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
    "connection_id"    UUID NOT NULL,
    "tenant_id"        UUID NOT NULL,
    "provider"         TEXT NOT NULL,
    "access_token_enc" TEXT NOT NULL,
    "refresh_token_enc" TEXT,
    "expires_at"       TIMESTAMPTZ NOT NULL,
    "scope"            TEXT NOT NULL DEFAULT '',
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "erp_oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- One token row per connection
CREATE UNIQUE INDEX "erp_oauth_tokens_connection_id_key"
    ON "erp_oauth_tokens"("connection_id");

-- Index for tenant + provider lookups
CREATE INDEX "erp_oauth_tokens_tenant_id_provider_idx"
    ON "erp_oauth_tokens"("tenant_id", "provider");

ALTER TABLE "erp_oauth_tokens"
    ADD CONSTRAINT "erp_oauth_tokens_connection_id_fkey"
    FOREIGN KEY ("connection_id")
    REFERENCES "external_connections"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "erp_oauth_tokens"
    ADD CONSTRAINT "erp_oauth_tokens_tenant_id_fkey"
    FOREIGN KEY ("tenant_id")
    REFERENCES "tenants"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
