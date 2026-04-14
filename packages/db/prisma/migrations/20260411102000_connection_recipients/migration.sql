DO $$
BEGIN
  CREATE TYPE recipient_type AS ENUM (
    'user_primary',
    'client_contact',
    'shared_mailbox',
    'ops',
    'advisor_contact'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "connection_recipients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "connection_id" uuid NOT NULL REFERENCES "external_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "email" text NOT NULL,
  "recipient_type" recipient_type NOT NULL,
  "is_mandatory" boolean NOT NULL DEFAULT false,
  "is_client_side" boolean NOT NULL DEFAULT false,
  "is_confirmed" boolean NOT NULL DEFAULT false,
  "created_by_user_id" text REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "disabled_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "connection_recipients_connection_id_disabled_at_idx"
  ON "connection_recipients"("connection_id", "disabled_at");

CREATE INDEX IF NOT EXISTS "connection_recipients_tenant_id_is_client_side_disabled_at_idx"
  ON "connection_recipients"("tenant_id", "is_client_side", "disabled_at");

CREATE INDEX IF NOT EXISTS "connection_recipients_email_idx"
  ON "connection_recipients"("email");
