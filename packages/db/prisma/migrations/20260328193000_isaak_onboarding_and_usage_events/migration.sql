-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM (
  'LEAD_CREATED',
  'EMAIL_VERIFIED',
  'LOGIN_COMPLETED',
  'HOLDED_CONNECTED',
  'ONBOARDING_STARTED',
  'ONBOARDING_COMPLETED',
  'ISAAK_CHAT_OPENED',
  'FIRST_CHAT_CREATED',
  'FIRST_MESSAGE_SENT',
  'SUMMARY_REQUESTED',
  'CONNECTION_ERROR',
  'PREMIUM_INTEREST_FLAGGED'
);

-- CreateTable
CREATE TABLE "isaak_onboarding_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" TEXT,
  "preferred_name" TEXT,
  "company_name" TEXT,
  "role_in_company" TEXT,
  "business_sector" TEXT,
  "team_size" TEXT,
  "website" TEXT,
  "phone" TEXT,
  "main_goals" JSONB,
  "communication_style" TEXT,
  "likely_knowledge_level" TEXT,
  "business_context_summary" TEXT,
  "holded_context_snapshot" JSONB,
  "onboarding_started_at" TIMESTAMPTZ,
  "onboarding_completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "isaak_onboarding_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID,
  "user_id" TEXT,
  "type" "UsageEventType" NOT NULL,
  "source" TEXT,
  "path" TEXT,
  "metadata_json" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "isaak_onboarding_profiles_tenant_id_user_id_key"
ON "isaak_onboarding_profiles"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "isaak_onboarding_profiles_tenant_id_idx"
ON "isaak_onboarding_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "isaak_onboarding_profiles_user_id_idx"
ON "isaak_onboarding_profiles"("user_id");

-- CreateIndex
CREATE INDEX "usage_events_type_created_at_idx"
ON "usage_events"("type", "created_at");

-- CreateIndex
CREATE INDEX "usage_events_tenant_id_created_at_idx"
ON "usage_events"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_events_user_id_created_at_idx"
ON "usage_events"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "isaak_onboarding_profiles"
ADD CONSTRAINT "isaak_onboarding_profiles_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isaak_onboarding_profiles"
ADD CONSTRAINT "isaak_onboarding_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events"
ADD CONSTRAINT "usage_events_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events"
ADD CONSTRAINT "usage_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
