-- CreateTable
CREATE TABLE "isaak_onboarding_emails" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email_type" TEXT NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "isaak_onboarding_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "isaak_onboarding_emails_tenant_id_email_type_key" ON "isaak_onboarding_emails"("tenant_id", "email_type");

-- CreateIndex
CREATE INDEX "isaak_onboarding_emails_tenant_id_idx" ON "isaak_onboarding_emails"("tenant_id");

-- AddForeignKey
ALTER TABLE "isaak_onboarding_emails" ADD CONSTRAINT "isaak_onboarding_emails_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
