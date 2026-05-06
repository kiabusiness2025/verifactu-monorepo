-- CreateTable: tenant-level reconciliation rules for banking
CREATE TABLE "bank_reconciliation_configs" (
    "tenant_id" UUID NOT NULL,
    "amount_tolerance_eur" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "date_window_days" INTEGER NOT NULL DEFAULT 3,
    "confidence_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "auto_match_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bank_reconciliation_configs_pkey" PRIMARY KEY ("tenant_id")
);

ALTER TABLE "bank_reconciliation_configs"
    ADD CONSTRAINT "bank_reconciliation_configs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
