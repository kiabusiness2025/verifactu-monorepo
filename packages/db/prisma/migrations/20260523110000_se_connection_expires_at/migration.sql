-- Add expires_at column to se_connections for Enable Banking session expiry tracking
ALTER TABLE "se_connections" ADD COLUMN "expires_at" TIMESTAMPTZ;
