-- AlterTable WhatsAppThread: add mode, language, assigned_agent_id
ALTER TABLE "whatsapp_threads" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'bot';
ALTER TABLE "whatsapp_threads" ADD COLUMN "language" TEXT;
ALTER TABLE "whatsapp_threads" ADD COLUMN "assigned_agent_id" UUID;

-- CreateIndex
CREATE INDEX "whatsapp_threads_mode_status_idx" ON "whatsapp_threads"("mode", "status");
CREATE INDEX "whatsapp_threads_assigned_agent_id_idx" ON "whatsapp_threads"("assigned_agent_id");

-- AddForeignKey
ALTER TABLE "whatsapp_threads" ADD CONSTRAINT "whatsapp_threads_assigned_agent_id_fkey"
  FOREIGN KEY ("assigned_agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable WhatsAppTemplate
CREATE TABLE "whatsapp_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "language" TEXT NOT NULL DEFAULT 'es',
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_templates_name_key" ON "whatsapp_templates"("name");
CREATE INDEX "whatsapp_templates_category_is_active_idx" ON "whatsapp_templates"("category", "is_active");
CREATE INDEX "whatsapp_templates_language_idx" ON "whatsapp_templates"("language");
