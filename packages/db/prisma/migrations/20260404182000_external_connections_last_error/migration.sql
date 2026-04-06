ALTER TABLE external_connections
  ADD COLUMN IF NOT EXISTS last_error text;