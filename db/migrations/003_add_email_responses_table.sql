-- Migration: Add admin_email_responses table
-- Purpose: Track email responses sent from soporte@verifactu.business
-- Version: 006

CREATE TABLE IF NOT EXISTS admin_email_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email_id UUID NOT NULL REFERENCES admin_emails(id) ON DELETE CASCADE,
  response_email_id TEXT NOT NULL UNIQUE, -- ID de Resend
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  from_email TEXT NOT NULL DEFAULT 'soporte@verifactu.business',
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_email_responses_email_id 
  ON admin_email_responses(admin_email_id);
CREATE INDEX IF NOT EXISTS idx_admin_email_responses_sent_at 
  ON admin_email_responses(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_email_responses_response_id 
  ON admin_email_responses(response_email_id);

-- Add response_email_id tracking to admin_emails
ALTER TABLE admin_emails 
ADD COLUMN IF NOT EXISTS response_email_id TEXT,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_admin_emails_responded_at 
  ON admin_emails(responded_at DESC);
