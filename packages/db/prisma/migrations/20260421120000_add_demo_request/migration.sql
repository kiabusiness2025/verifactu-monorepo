DO $$
BEGIN
  CREATE TYPE "DemoRequestStatus" AS ENUM (
    'PENDING',
    'CONTACTED',
    'SCHEDULED',
    'COMPLETED',
    'DISQUALIFIED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "demo_requests" (
  "id"           TEXT NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  "name"         TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "phone"        TEXT,
  "company_name" TEXT NOT NULL,
  "tax_id"       TEXT,
  "role"         TEXT,
  "uses_holded"  BOOLEAN NOT NULL DEFAULT false,
  "objective"    TEXT,
  "source"       TEXT,
  "consent"      BOOLEAN NOT NULL DEFAULT false,
  "status"       "DemoRequestStatus" NOT NULL DEFAULT 'PENDING',
  "notes"        TEXT,
  "metadata_json" JSONB,

  CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "demo_requests_status_idx" ON "demo_requests"("status");
CREATE INDEX IF NOT EXISTS "demo_requests_created_at_idx" ON "demo_requests"("created_at");
