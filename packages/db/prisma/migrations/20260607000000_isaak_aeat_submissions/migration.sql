-- C-B1 — Audit log de presentaciones AEAT (303, 130, 111, etc.)
-- Inmutable en espíritu: el status solo avanza hacia adelante
-- (pending_aeat → submitted → accepted/rejected/error o cancelled).
-- El payload + payloadHash + certFingerprint son la prueba legal de
-- qué se envió y con qué cert.

CREATE TABLE "isaak_aeat_submissions" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        UUID NOT NULL,

  "model"            TEXT NOT NULL,
  "period"           TEXT NOT NULL,
  "tax_return_id"    UUID,

  "status"           TEXT NOT NULL DEFAULT 'pending_aeat',

  "payload"          JSONB NOT NULL,
  "payload_hash"     VARCHAR(64) NOT NULL,

  "cert_fingerprint" VARCHAR(64),

  "aeat_response"    JSONB,
  "aeat_reference"   TEXT,

  "submitted_by"     TEXT NOT NULL,
  "submitted_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "acked_at"         TIMESTAMPTZ,
  "error_message"    TEXT,

  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "isaak_aeat_submissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "isaak_aeat_submissions_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "isaak_aeat_submissions_status_check"
    CHECK ("status" IN ('pending_aeat', 'submitted', 'accepted', 'rejected', 'error', 'cancelled')),
  CONSTRAINT "isaak_aeat_submissions_payload_hash_format_check"
    CHECK (char_length("payload_hash") = 64),
  CONSTRAINT "isaak_aeat_submissions_cert_fingerprint_format_check"
    CHECK ("cert_fingerprint" IS NULL OR char_length("cert_fingerprint") = 64)
);

CREATE INDEX "isaak_aeat_submissions_tenant_status_idx"
  ON "isaak_aeat_submissions" ("tenant_id", "status");

CREATE INDEX "isaak_aeat_submissions_tenant_model_period_idx"
  ON "isaak_aeat_submissions" ("tenant_id", "model", "period");

CREATE INDEX "isaak_aeat_submissions_tenant_submitted_idx"
  ON "isaak_aeat_submissions" ("tenant_id", "submitted_at" DESC);
