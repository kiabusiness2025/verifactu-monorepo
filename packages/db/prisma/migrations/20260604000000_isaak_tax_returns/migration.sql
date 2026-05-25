-- F11 fase 4 — Tabla de modelos tributarios presentados.
--
-- Alimenta los cruces audit del Inspector AEAT: R086/R087 (modelo vs
-- retenciones detectadas), R100/R101/R102/R106 (modelo esperado pero
-- no presentado).
--
-- Constraint clave: un solo registro vigente por (tenant, modelo,
-- periodo). Las rectificativas se modelan marcando el previo como
-- 'rectified' y creando uno nuevo (con sufijo en notes/reference).

CREATE TABLE "isaak_tax_returns" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID NOT NULL,

  "model"            TEXT NOT NULL,
  "period"           TEXT NOT NULL,
  "fiscal_year"      INTEGER NOT NULL,

  "status"           TEXT NOT NULL DEFAULT 'draft',

  "amount_declared"  NUMERIC(14, 2) NOT NULL,
  "amount_to_pay"    NUMERIC(14, 2),
  "amount_to_refund" NUMERIC(14, 2),

  "presented_at"     TIMESTAMPTZ,
  "due_date"         DATE,
  "reference_number" TEXT,
  "attachment_url"   TEXT,

  "notes"            TEXT,
  "created_by"       TEXT NOT NULL,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "isaak_tax_returns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "isaak_tax_returns_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "isaak_tax_returns_tenant_model_period_unique"
    UNIQUE ("tenant_id", "model", "period"),
  CONSTRAINT "isaak_tax_returns_status_check"
    CHECK ("status" IN ('draft', 'presented', 'accepted', 'rejected', 'rectified')),
  CONSTRAINT "isaak_tax_returns_model_check"
    CHECK ("model" IN (
      '303', '130', '111', '115', '180', '190', '200', '202',
      '347', '349', '390', '720', '100', '714'
    ))
);

CREATE INDEX "isaak_tax_returns_tenant_status_idx"
  ON "isaak_tax_returns" ("tenant_id", "status");

CREATE INDEX "isaak_tax_returns_tenant_due_idx"
  ON "isaak_tax_returns" ("tenant_id", "due_date");

CREATE INDEX "isaak_tax_returns_tenant_year_idx"
  ON "isaak_tax_returns" ("tenant_id", "fiscal_year");
