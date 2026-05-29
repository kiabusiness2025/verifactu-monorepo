-- F15-payments: pagos Telegram via Stripe provider (sendInvoice flow).

CREATE TABLE "telegram_payments" (
    "id"                 UUID        NOT NULL DEFAULT gen_random_uuid(),
    "chat_db_id"         UUID        NOT NULL,
    "tenant_id"          UUID,
    "plan_code"          TEXT        NOT NULL,
    "amount_cents"       INTEGER     NOT NULL,
    "currency"           TEXT        NOT NULL DEFAULT 'EUR',
    "telegram_charge_id" TEXT        NOT NULL,
    "provider_charge_id" TEXT,
    "order_email"        TEXT,
    "order_name"         TEXT,
    "paid_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
    "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "telegram_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_payments_telegram_charge_id_key"
    ON "telegram_payments"("telegram_charge_id");

CREATE INDEX "telegram_payments_chat_db_id_idx"
    ON "telegram_payments"("chat_db_id");

CREATE INDEX "telegram_payments_tenant_id_idx"
    ON "telegram_payments"("tenant_id");

ALTER TABLE "telegram_payments"
    ADD CONSTRAINT "telegram_payments_chat_db_id_fkey"
    FOREIGN KEY ("chat_db_id") REFERENCES "telegram_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "telegram_payments"
    ADD CONSTRAINT "telegram_payments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
