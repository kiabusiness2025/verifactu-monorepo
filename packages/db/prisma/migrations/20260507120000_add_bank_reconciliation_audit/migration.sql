-- CreateTable se_transaction_match_audits
CREATE TABLE "se_transaction_match_audits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "se_transaction_id" TEXT NOT NULL,
    "matched_expense_id" UUID,
    "match_score" DOUBLE PRECISION NOT NULL,
    "score_components" JSONB NOT NULL,
    "evidence_reasons" JSONB NOT NULL,
    "auto_matched" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "se_transaction_match_audits_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "se_transaction_match_audits" ADD CONSTRAINT "se_transaction_match_audits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "se_transaction_match_audits" ADD CONSTRAINT "se_transaction_match_audits_se_transaction_id_fkey" FOREIGN KEY ("se_transaction_id") REFERENCES "se_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "se_transaction_match_audits" ADD CONSTRAINT "se_transaction_match_audits_matched_expense_id_fkey" FOREIGN KEY ("matched_expense_id") REFERENCES "expense_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "se_transaction_match_audits_tenant_id_idx" ON "se_transaction_match_audits"("tenant_id");

-- CreateIndex
CREATE INDEX "se_transaction_match_audits_se_transaction_id_idx" ON "se_transaction_match_audits"("se_transaction_id");

-- CreateIndex
CREATE INDEX "se_transaction_match_audits_matched_expense_id_idx" ON "se_transaction_match_audits"("matched_expense_id");

-- CreateIndex
CREATE INDEX "se_transaction_match_audits_created_at_idx" ON "se_transaction_match_audits"("created_at");
