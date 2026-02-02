-- Add updated_at to users table (landing auth uses this table)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create tenant_profiles table
CREATE TABLE IF NOT EXISTS "tenant_profiles" (
  "tenant_id" UUID NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "source_id" TEXT,
  "cnae" TEXT,
  "incorporation_date" DATE,
  "address" TEXT,
  "city" TEXT,
  "province" TEXT,
  "representative" TEXT,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_profiles_pkey" PRIMARY KEY ("tenant_id"),
  CONSTRAINT "tenant_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
