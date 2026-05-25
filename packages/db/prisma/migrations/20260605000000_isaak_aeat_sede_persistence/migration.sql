-- C-A — Persistencia de notificaciones AEAT y snapshots del censo
-- para detección de cambios y deduplicación entre runs del cron.

-- ── Notificaciones AEAT (DEH) ────────────────────────────────────────

CREATE TABLE "isaak_aeat_notifications" (
  "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         UUID NOT NULL,

  "external_id"       TEXT NOT NULL,

  "title"             TEXT NOT NULL,
  "emisor"            TEXT NOT NULL,
  "tipo"              TEXT NOT NULL,
  "estado"            TEXT NOT NULL,

  "notification_date" TIMESTAMPTZ NOT NULL,
  "received_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "acknowledged_at"   TIMESTAMPTZ,
  "expires_at"        TIMESTAMPTZ,

  "pdf_url"           TEXT,
  "pdf_stored_at"     TIMESTAMPTZ,

  "alert_sent"        BOOLEAN NOT NULL DEFAULT FALSE,
  "alert_sent_at"     TIMESTAMPTZ,

  "raw_xml"           TEXT,

  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "isaak_aeat_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "isaak_aeat_notifications_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "isaak_aeat_notifications_tenant_external_unique"
    UNIQUE ("tenant_id", "external_id"),
  CONSTRAINT "isaak_aeat_notifications_estado_check"
    CHECK ("estado" IN ('pendiente', 'leida', 'expirada', 'archivada'))
);

CREATE INDEX "isaak_aeat_notifications_tenant_estado_idx"
  ON "isaak_aeat_notifications" ("tenant_id", "estado");

CREATE INDEX "isaak_aeat_notifications_tenant_date_idx"
  ON "isaak_aeat_notifications" ("tenant_id", "notification_date" DESC);

CREATE INDEX "isaak_aeat_notifications_tenant_alert_idx"
  ON "isaak_aeat_notifications" ("tenant_id", "alert_sent");

-- ── Snapshots del censo 036/037 ──────────────────────────────────────

CREATE TABLE "isaak_aeat_census_snapshots" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    UUID NOT NULL,
  "data"         JSONB NOT NULL,
  "content_hash" VARCHAR(64) NOT NULL,
  "captured_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "isaak_aeat_census_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "isaak_aeat_census_snapshots_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "isaak_aeat_census_snapshots_hash_format_check"
    CHECK (char_length("content_hash") = 64)
);

CREATE INDEX "isaak_aeat_census_snapshots_tenant_captured_idx"
  ON "isaak_aeat_census_snapshots" ("tenant_id", "captured_at" DESC);

-- ── Cambios censales detectados ──────────────────────────────────────

CREATE TABLE "isaak_aeat_census_changes" (
  "id"                   UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"            UUID NOT NULL,

  "field"                TEXT NOT NULL,
  "change_type"          TEXT NOT NULL,
  "old_value"            TEXT,
  "new_value"            TEXT,

  "previous_snapshot_id" UUID,
  "current_snapshot_id"  UUID NOT NULL,

  "alert_sent"           BOOLEAN NOT NULL DEFAULT FALSE,
  "alert_sent_at"        TIMESTAMPTZ,

  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "isaak_aeat_census_changes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "isaak_aeat_census_changes_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "isaak_aeat_census_changes_change_type_check"
    CHECK ("change_type" IN ('added', 'removed', 'modified'))
);

CREATE INDEX "isaak_aeat_census_changes_tenant_created_idx"
  ON "isaak_aeat_census_changes" ("tenant_id", "created_at" DESC);

CREATE INDEX "isaak_aeat_census_changes_tenant_alert_idx"
  ON "isaak_aeat_census_changes" ("tenant_id", "alert_sent");
