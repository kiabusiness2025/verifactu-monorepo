-- CreateTable
CREATE TABLE "isaak_gmail_scans" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "scanned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message_count" INTEGER NOT NULL,
    "results" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "isaak_gmail_scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "isaak_gmail_scans_tenant_id_idx" ON "isaak_gmail_scans"("tenant_id");

-- AddForeignKey
ALTER TABLE "isaak_gmail_scans" ADD CONSTRAINT "isaak_gmail_scans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
