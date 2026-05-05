-- CreateTable: Salt Edge Open Banking integration

CREATE TABLE "se_customers" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "se_customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "se_connections" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "se_customer_id" TEXT NOT NULL,
    "provider_code" TEXT NOT NULL,
    "provider_name" TEXT NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'ES',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "last_sync_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "se_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "se_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "connection_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nature" TEXT NOT NULL DEFAULT 'account',
    "balance" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "iban" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "se_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "se_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "account_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'posted',
    "made_on" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'uncategorized',
    "payee" TEXT,
    "payer" TEXT,
    "duplicated" BOOLEAN NOT NULL DEFAULT false,
    "reconciled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "se_transactions_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "se_customers_tenant_id_key" ON "se_customers"("tenant_id");
CREATE UNIQUE INDEX "se_customers_identifier_key" ON "se_customers"("identifier");

-- Indexes
CREATE INDEX "se_connections_tenant_id_idx" ON "se_connections"("tenant_id");
CREATE INDEX "se_accounts_tenant_id_idx" ON "se_accounts"("tenant_id");
CREATE INDEX "se_accounts_connection_id_idx" ON "se_accounts"("connection_id");
CREATE INDEX "se_transactions_tenant_id_idx" ON "se_transactions"("tenant_id");
CREATE INDEX "se_transactions_account_id_idx" ON "se_transactions"("account_id");
CREATE INDEX "se_transactions_made_on_idx" ON "se_transactions"("made_on");

-- Foreign Keys
ALTER TABLE "se_customers" ADD CONSTRAINT "se_customers_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "se_connections" ADD CONSTRAINT "se_connections_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "se_connections" ADD CONSTRAINT "se_connections_se_customer_id_fkey"
    FOREIGN KEY ("se_customer_id") REFERENCES "se_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "se_accounts" ADD CONSTRAINT "se_accounts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "se_accounts" ADD CONSTRAINT "se_accounts_connection_id_fkey"
    FOREIGN KEY ("connection_id") REFERENCES "se_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "se_transactions" ADD CONSTRAINT "se_transactions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "se_transactions" ADD CONSTRAINT "se_transactions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "se_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
