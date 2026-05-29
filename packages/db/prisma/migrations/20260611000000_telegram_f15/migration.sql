-- F15: Telegram bot — chats, messages, link tokens.

CREATE TABLE "telegram_chats" (
    "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
    "chat_id"         BIGINT      NOT NULL,
    "tenant_id"       UUID,
    "username"        TEXT,
    "first_name"      TEXT,
    "language"        TEXT        DEFAULT 'es',
    "mode"            TEXT        NOT NULL DEFAULT 'bot',
    "last_message_at" TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"      TIMESTAMPTZ NOT NULL,

    CONSTRAINT "telegram_chats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_chats_chat_id_key" ON "telegram_chats"("chat_id");
CREATE INDEX "telegram_chats_tenant_id_idx" ON "telegram_chats"("tenant_id");

ALTER TABLE "telegram_chats"
    ADD CONSTRAINT "telegram_chats_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "telegram_messages" (
    "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
    "chat_id"    UUID        NOT NULL,
    "tenant_id"  UUID,
    "message_id" INTEGER,
    "direction"  TEXT        NOT NULL,
    "event_type" TEXT        NOT NULL,
    "body"       TEXT,
    "payload"    JSONB,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "telegram_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "telegram_messages_chat_id_occurred_at_idx"   ON "telegram_messages"("chat_id", "occurred_at");
CREATE INDEX "telegram_messages_tenant_id_occurred_at_idx" ON "telegram_messages"("tenant_id", "occurred_at");

ALTER TABLE "telegram_messages"
    ADD CONSTRAINT "telegram_messages_chat_id_fkey"
    FOREIGN KEY ("chat_id") REFERENCES "telegram_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "telegram_messages"
    ADD CONSTRAINT "telegram_messages_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "telegram_link_tokens" (
    "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"  UUID        NOT NULL,
    "token"      TEXT        NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at"    TIMESTAMPTZ,
    "chat_id"    BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "telegram_link_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_link_tokens_token_key" ON "telegram_link_tokens"("token");
CREATE INDEX "telegram_link_tokens_tenant_id_idx" ON "telegram_link_tokens"("tenant_id");

ALTER TABLE "telegram_link_tokens"
    ADD CONSTRAINT "telegram_link_tokens_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
