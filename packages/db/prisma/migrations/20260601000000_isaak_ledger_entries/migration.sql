-- F9 Isaak Ledger nativo: libro mayor interno como fuente de verdad.
--
-- Cada asiento se encadena por hash (SHA-256) al anterior del mismo
-- tenant, formando una cadena inmutable equivalente a la requerida
-- por Verifactu/SII para el audit trail fiscal.
--
-- Invariantes (enforced en aplicación + tests):
--   * tenant_id SIEMPRE primer filtro en queries (aislamiento estricto)
--   * hash UNIQUE por tenant (un asiento no puede colisionar dentro de un tenant)
--   * sequence es monotónico ascendente y global a la tabla; el orden
--     lógico por tenant se obtiene ordenando por sequence ASC

CREATE TABLE "isaak_ledger_entries" (
  "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           UUID NOT NULL,

  "entry_date"          DATE NOT NULL,
  "doc_number"          TEXT,
  "doc_type"            TEXT NOT NULL,

  "counterparty_nif"    TEXT,
  "counterparty_name"   TEXT,

  "amount"              NUMERIC(14, 2) NOT NULL,
  "currency"            VARCHAR(3) NOT NULL DEFAULT 'EUR',
  "tax_base"            NUMERIC(14, 2),
  "vat_rate"            NUMERIC(5, 2),
  "vat_amount"          NUMERIC(14, 2),

  "account_debit"       TEXT,
  "account_credit"      TEXT,

  "description"         TEXT NOT NULL,
  "attachment_url"      TEXT,

  "source_system"       TEXT NOT NULL,
  "holded_id"           TEXT,

  "hash"                VARCHAR(64) NOT NULL,
  "prev_hash"           VARCHAR(64),
  "sequence"            BIGSERIAL NOT NULL,

  "verifactu_ref"       TEXT,
  "verifactu_at"        TIMESTAMPTZ,
  "sii"                 BOOLEAN NOT NULL DEFAULT FALSE,
  "sii_sent_at"         TIMESTAMPTZ,

  "created_by"          TEXT NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "isaak_ledger_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "isaak_ledger_entries_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "isaak_ledger_entries_tenant_hash_unique"
    UNIQUE ("tenant_id", "hash"),
  CONSTRAINT "isaak_ledger_entries_doc_type_check"
    CHECK ("doc_type" IN (
      'invoice_in', 'invoice_out', 'expense', 'payroll',
      'journal', 'tax_payment'
    )),
  CONSTRAINT "isaak_ledger_entries_source_system_check"
    CHECK ("source_system" IN (
      'holded', 'manual', 'ocr', 'banking', 'isaak_auto'
    )),
  CONSTRAINT "isaak_ledger_entries_amount_finite_check"
    CHECK ("amount" = "amount"),
  CONSTRAINT "isaak_ledger_entries_hash_format_check"
    CHECK (char_length("hash") = 64),
  CONSTRAINT "isaak_ledger_entries_prev_hash_format_check"
    CHECK ("prev_hash" IS NULL OR char_length("prev_hash") = 64)
);

-- Lookup indexes — todos prefijan por tenant_id para aislamiento.
CREATE INDEX "isaak_ledger_entries_tenant_date_idx"
  ON "isaak_ledger_entries" ("tenant_id", "entry_date" DESC);

CREATE INDEX "isaak_ledger_entries_tenant_doctype_date_idx"
  ON "isaak_ledger_entries" ("tenant_id", "doc_type", "entry_date");

CREATE INDEX "isaak_ledger_entries_tenant_sequence_idx"
  ON "isaak_ledger_entries" ("tenant_id", "sequence" DESC);

CREATE INDEX "isaak_ledger_entries_tenant_source_idx"
  ON "isaak_ledger_entries" ("tenant_id", "source_system");

CREATE INDEX "isaak_ledger_entries_tenant_verifactu_idx"
  ON "isaak_ledger_entries" ("tenant_id", "verifactu_ref");
