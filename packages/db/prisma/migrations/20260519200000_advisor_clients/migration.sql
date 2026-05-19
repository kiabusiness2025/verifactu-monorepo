-- CreateTable
CREATE TABLE "advisor_clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "advisor_tenant_id" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "company_name" TEXT,
    "nif" TEXT,
    "holded_api_key_enc" TEXT,
    "holded_key_masked" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "advisor_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "advisor_clients_advisor_tenant_id_is_active_idx" ON "advisor_clients"("advisor_tenant_id", "is_active");

-- AddForeignKey
ALTER TABLE "advisor_clients" ADD CONSTRAINT "advisor_clients_advisor_tenant_id_fkey" FOREIGN KEY ("advisor_tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
