-- CreateTable
CREATE TABLE "gc_mandates" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "gc_customer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_submission',
    "scheme" TEXT NOT NULL DEFAULT 'sepa_core',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "gc_mandates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gc_payments" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "mandate_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "charge_date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_submission',
    "description" TEXT,
    "reference" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "gc_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gc_mandates_tenant_id_idx" ON "gc_mandates"("tenant_id");
CREATE INDEX "gc_mandates_user_id_idx" ON "gc_mandates"("user_id");
CREATE INDEX "gc_payments_tenant_id_idx" ON "gc_payments"("tenant_id");
CREATE INDEX "gc_payments_mandate_id_idx" ON "gc_payments"("mandate_id");

-- AddForeignKey
ALTER TABLE "gc_mandates" ADD CONSTRAINT "gc_mandates_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gc_payments" ADD CONSTRAINT "gc_payments_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gc_payments" ADD CONSTRAINT "gc_payments_mandate_id_fkey"
    FOREIGN KEY ("mandate_id") REFERENCES "gc_mandates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
