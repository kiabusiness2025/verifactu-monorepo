-- Store a dedicated, verified company notification email per tenant.
-- This table is independent from Prisma models to keep rollout low-risk.

CREATE TABLE IF NOT EXISTS company_notification_emails (
  tenant_id uuid PRIMARY KEY,
  email text NOT NULL,
  verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_notification_emails
  ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;

CREATE INDEX IF NOT EXISTS company_notification_emails_email_idx
  ON company_notification_emails (email);
