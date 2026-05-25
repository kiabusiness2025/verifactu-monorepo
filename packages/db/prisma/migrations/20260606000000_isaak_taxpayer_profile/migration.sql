-- I7 R000 — Perfil fiscal del contribuyente.
--
-- Persistencia de TaxpayerProfileSnapshot. Una sola fila por tenant
-- (UNIQUE tenant_id). Se rellena vía wizard R000 o tool LLM
-- isaak_set_fiscal_profile; los warnings/scope del Inspector AEAT
-- usan estos datos cuando están presentes.

CREATE TABLE "isaak_taxpayer_profiles" (
  "id"                          UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                   UUID NOT NULL,

  "taxpayer_type"               TEXT,
  "territory"                   TEXT,
  "vat_regime"                  TEXT,
  "sector"                      TEXT,

  "corporate_tax_subject"       BOOLEAN,
  "has_employees"               BOOLEAN,
  "has_rent_withholding"        BOOLEAN,
  "has_professional_invoices"   BOOLEAN,
  "has_intra_eu_operations"     BOOLEAN,
  "has_related_parties"         BOOLEAN,
  "uses_billing_software"       BOOLEAN,

  "annual_turnover"             NUMERIC(14, 2),

  "prefilled_from_ci"           BOOLEAN NOT NULL DEFAULT FALSE,
  "prefilled_at"                TIMESTAMPTZ,
  "confirmed_by_user"           BOOLEAN NOT NULL DEFAULT FALSE,
  "confirmed_at"                TIMESTAMPTZ,
  "confirmed_by"                TEXT,

  "notes"                       TEXT,

  "created_at"                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "isaak_taxpayer_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "isaak_taxpayer_profiles_tenant_unique" UNIQUE ("tenant_id"),
  CONSTRAINT "isaak_taxpayer_profiles_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "isaak_taxpayer_profiles_taxpayer_type_check"
    CHECK ("taxpayer_type" IS NULL OR "taxpayer_type" IN (
      'autonomo', 'sl', 'sa', 'comunidad_bienes', 'asociacion', 'fundacion'
    )),
  CONSTRAINT "isaak_taxpayer_profiles_territory_check"
    CHECK ("territory" IS NULL OR "territory" IN (
      'comun', 'canarias', 'pais_vasco', 'navarra', 'ceuta_melilla'
    )),
  CONSTRAINT "isaak_taxpayer_profiles_vat_regime_check"
    CHECK ("vat_regime" IS NULL OR "vat_regime" IN (
      'general', 'recargo_equivalencia', 'criterio_caja',
      'simplificado', 'prorrata', 'sii', 'exento'
    ))
);
