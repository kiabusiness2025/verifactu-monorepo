-- CreateTable
CREATE TABLE "isaak_push_preferences" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "alerta_fiscal" BOOLEAN NOT NULL DEFAULT true,
    "documento_sin_conciliar" BOOLEAN NOT NULL DEFAULT true,
    "aviso_proactivo_isaak" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "isaak_push_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "isaak_push_preferences_tenant_id_user_id_key" ON "isaak_push_preferences"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "isaak_push_preferences_tenant_id_idx" ON "isaak_push_preferences"("tenant_id");

-- AddForeignKey
ALTER TABLE "isaak_push_preferences" ADD CONSTRAINT "isaak_push_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
