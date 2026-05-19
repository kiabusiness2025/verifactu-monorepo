-- CreateTable: invoice_templates
CREATE TABLE "invoice_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "source_type" TEXT NOT NULL DEFAULT 'custom',
    "predefined_slug" TEXT,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "accent_color" TEXT,
    "font_family" TEXT,
    "logo_url" TEXT,
    "layout_config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "invoice_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant_certificates
CREATE TABLE "tenant_certificates" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cert_type" TEXT NOT NULL,
    "nif" TEXT NOT NULL,
    "common_name" TEXT NOT NULL,
    "issuer" TEXT,
    "valid_from" TIMESTAMPTZ NOT NULL,
    "valid_to" TIMESTAMPTZ NOT NULL,
    "encrypted_p12" BYTEA NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenant_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_templates_tenant_id_idx" ON "invoice_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_certificates_tenant_id_idx" ON "tenant_certificates"("tenant_id");

-- AddForeignKey
ALTER TABLE "invoice_templates" ADD CONSTRAINT "invoice_templates_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_certificates" ADD CONSTRAINT "tenant_certificates_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
