-- ─── Enums (idempotent) ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WhatsAppThreadStatus') THEN
    CREATE TYPE "WhatsAppThreadStatus" AS ENUM ('open', 'opted_out', 'closed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WhatsAppEventDirection') THEN
    CREATE TYPE "WhatsAppEventDirection" AS ENUM ('inbound', 'outbound', 'system');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WhatsAppEventStatus') THEN
    CREATE TYPE "WhatsAppEventStatus" AS ENUM ('received', 'queued', 'sent', 'delivered', 'read', 'failed');
  END IF;
END $$;

-- ─── Base tables (idempotent) ──────────────────────────────────────────────────
-- assigned_agent_id is TEXT (not UUID) because User.id is cuid() TEXT

CREATE TABLE IF NOT EXISTS "whatsapp_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "channel_identity_id" UUID,
    "support_ticket_id" UUID,
    "order_id" UUID,
    "phone_number" TEXT NOT NULL,
    "status" "WhatsAppThreadStatus" NOT NULL DEFAULT 'open',
    "consent_at" TIMESTAMPTZ,
    "last_message_at" TIMESTAMPTZ,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_threads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "whatsapp_threads_tenant_id_status_idx" ON "whatsapp_threads"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "whatsapp_threads_support_ticket_id_idx" ON "whatsapp_threads"("support_ticket_id");
CREATE INDEX IF NOT EXISTS "whatsapp_threads_order_id_idx" ON "whatsapp_threads"("order_id");
CREATE INDEX IF NOT EXISTS "whatsapp_threads_channel_identity_id_idx" ON "whatsapp_threads"("channel_identity_id");
CREATE INDEX IF NOT EXISTS "whatsapp_threads_phone_number_idx" ON "whatsapp_threads"("phone_number");

CREATE TABLE IF NOT EXISTS "whatsapp_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "tenant_id" UUID,
    "provider_message_id" TEXT,
    "event_type" TEXT NOT NULL,
    "direction" "WhatsAppEventDirection" NOT NULL,
    "status" "WhatsAppEventStatus" NOT NULL DEFAULT 'received',
    "body" TEXT,
    "payload" JSONB,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_events_provider_message_id_key" ON "whatsapp_events"("provider_message_id") WHERE "provider_message_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "whatsapp_events_thread_id_occurred_at_idx" ON "whatsapp_events"("thread_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "whatsapp_events_tenant_id_occurred_at_idx" ON "whatsapp_events"("tenant_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "whatsapp_events_status_occurred_at_idx" ON "whatsapp_events"("status", "occurred_at");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_events_thread_id_fkey') THEN
    ALTER TABLE "whatsapp_events" ADD CONSTRAINT "whatsapp_events_thread_id_fkey"
      FOREIGN KEY ("thread_id") REFERENCES "whatsapp_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── AlterTable: add mode, language, assigned_agent_id (idempotent) ───────────
ALTER TABLE "whatsapp_threads" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'bot';
ALTER TABLE "whatsapp_threads" ADD COLUMN IF NOT EXISTS "language" TEXT;
ALTER TABLE "whatsapp_threads" ADD COLUMN IF NOT EXISTS "assigned_agent_id" TEXT;

-- ─── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "whatsapp_threads_mode_status_idx" ON "whatsapp_threads"("mode", "status");
CREATE INDEX IF NOT EXISTS "whatsapp_threads_assigned_agent_id_idx" ON "whatsapp_threads"("assigned_agent_id");

-- ─── FK: assigned_agent_id → "User".id (TEXT, cuid) ──────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_threads_assigned_agent_id_fkey') THEN
    ALTER TABLE "whatsapp_threads" ADD CONSTRAINT "whatsapp_threads_assigned_agent_id_fkey"
      FOREIGN KEY ("assigned_agent_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── CreateTable WhatsAppTemplate ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "whatsapp_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "language" TEXT NOT NULL DEFAULT 'es',
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_templates_name_key" ON "whatsapp_templates"("name");
CREATE INDEX IF NOT EXISTS "whatsapp_templates_category_is_active_idx" ON "whatsapp_templates"("category", "is_active");
CREATE INDEX IF NOT EXISTS "whatsapp_templates_language_idx" ON "whatsapp_templates"("language");
