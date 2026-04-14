DO $$
BEGIN
  CREATE TYPE membership_role AS ENUM (
    'company_admin',
    'operator',
    'viewer',
    'advisor_operator'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE access_request_status AS ENUM (
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "access_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "connection_id" uuid NOT NULL REFERENCES "external_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "requester_user_id" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" access_request_status NOT NULL DEFAULT 'submitted',
  "requested_role" membership_role,
  "message" text,
  "resolved_by_user_id" text REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "resolved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "access_requests_connection_id_status_idx"
  ON "access_requests"("connection_id", "status");

CREATE INDEX IF NOT EXISTS "access_requests_requester_user_id_status_idx"
  ON "access_requests"("requester_user_id", "status");
