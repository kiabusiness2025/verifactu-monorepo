-- V2.D.1 — Ingesta del BORME (Boletín Oficial del Registro Mercantil).
-- Persiste actos publicados en BORME sección A para pre-rellenar
-- perfiles de tenants al conectar Holded.

CREATE TABLE "borme_acts" (
    "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
    "borme_id"         TEXT        NOT NULL,
    "publication_id"   TEXT        NOT NULL,
    "published_on"     DATE        NOT NULL,
    "provincia_code"   TEXT        NOT NULL,
    "seccion"          TEXT        NOT NULL DEFAULT 'A',
    "company_name"     TEXT        NOT NULL,
    "normalized_name"  TEXT        NOT NULL,
    "nif"              TEXT,
    "codigo_acto"      TEXT,
    "tipo_acto"        TEXT        NOT NULL,
    "raw_text"         TEXT        NOT NULL,
    "metadata"         JSONB,
    "ingested_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "borme_acts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "borme_act_unique"
    ON "borme_acts" ("borme_id", "normalized_name", "codigo_acto", "tipo_acto");

CREATE INDEX "borme_acts_normalized_name_published_on_idx"
    ON "borme_acts" ("normalized_name", "published_on" DESC);

CREATE INDEX "borme_acts_nif_published_on_idx"
    ON "borme_acts" ("nif", "published_on" DESC);

CREATE INDEX "borme_acts_published_on_idx"
    ON "borme_acts" ("published_on" DESC);
