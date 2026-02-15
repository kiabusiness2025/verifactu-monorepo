ALTER TABLE "tenant_profiles"
ADD COLUMN IF NOT EXISTS "admin_edit_history" JSONB;
