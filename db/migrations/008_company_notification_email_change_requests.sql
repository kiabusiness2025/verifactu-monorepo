CREATE TABLE IF NOT EXISTS company_notification_email_change_requests (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  requested_email text NOT NULL,
  current_confirmed_email text NOT NULL,
  requested_by_user_id text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  used_at timestamptz NULL
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'company_notification_email_change_requests'
      AND column_name = 'requested_by_uid'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'company_notification_email_change_requests'
      AND column_name = 'requested_by_user_id'
  ) THEN
    ALTER TABLE company_notification_email_change_requests
      RENAME COLUMN requested_by_uid TO requested_by_user_id;
  END IF;
END $$;

ALTER TABLE company_notification_email_change_requests
  ALTER COLUMN id TYPE uuid USING id::uuid;

ALTER TABLE company_notification_email_change_requests
  ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;

CREATE INDEX IF NOT EXISTS idx_company_notification_email_change_requests_tenant_created
  ON company_notification_email_change_requests (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_notification_email_change_requests_expires
  ON company_notification_email_change_requests (expires_at);
