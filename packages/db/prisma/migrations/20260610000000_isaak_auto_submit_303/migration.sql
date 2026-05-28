-- C-C: Auto-presentación 303 con veto-window de 48h.
-- Añade el flag autoSubmit303 al perfil fiscal y la tabla de cola.

ALTER TABLE "isaak_taxpayer_profiles"
  ADD COLUMN "auto_submit_303" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "isaak_auto_submit_303_queue" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"      UUID         NOT NULL,
    "ejercicio"      INTEGER      NOT NULL,
    "periodo"        TEXT         NOT NULL,
    "due_date"       DATE         NOT NULL,
    "status"         TEXT         NOT NULL DEFAULT 'pending_veto',
    "veto_token"     TEXT         NOT NULL,
    "veto_expires_at" TIMESTAMPTZ NOT NULL,
    "vetoed_at"      TIMESTAMPTZ,
    "draft_json"     JSONB,
    "email_sent_at"  TIMESTAMPTZ,
    "submitted_at"   TIMESTAMPTZ,
    "submission_id"  UUID,
    "error_message"  TEXT,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"     TIMESTAMPTZ NOT NULL,

    CONSTRAINT "isaak_auto_submit_303_queue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "isaak_auto_submit_303_queue_veto_token_key"
    ON "isaak_auto_submit_303_queue"("veto_token");

CREATE UNIQUE INDEX "isaak_auto_submit_303_queue_tenant_id_ejercicio_periodo_key"
    ON "isaak_auto_submit_303_queue"("tenant_id", "ejercicio", "periodo");

CREATE INDEX "isaak_auto_submit_303_queue_status_veto_expires_at_idx"
    ON "isaak_auto_submit_303_queue"("status", "veto_expires_at");

ALTER TABLE "isaak_auto_submit_303_queue"
    ADD CONSTRAINT "isaak_auto_submit_303_queue_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
