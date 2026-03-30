ALTER TABLE external_connections
  ADD COLUMN IF NOT EXISTS channel_key text NOT NULL DEFAULT 'dashboard';

UPDATE external_connections
SET channel_key = 'dashboard'
WHERE channel_key IS NULL;

DO $$
DECLARE existing_constraint text;
BEGIN
  SELECT conname
  INTO existing_constraint
  FROM pg_constraint
  WHERE conrelid = 'external_connections'::regclass
    AND contype = 'u'
    AND conkey = ARRAY[
      (SELECT attnum FROM pg_attribute WHERE attrelid = 'external_connections'::regclass AND attname = 'tenant_id'),
      (SELECT attnum FROM pg_attribute WHERE attrelid = 'external_connections'::regclass AND attname = 'provider')
    ];

  IF existing_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE external_connections DROP CONSTRAINT %I', existing_constraint);
  END IF;
END $$;

DROP INDEX IF EXISTS external_connections_tenant_provider_status_idx;

CREATE UNIQUE INDEX IF NOT EXISTS external_connections_tenant_provider_channel_key_key
  ON external_connections (tenant_id, provider, channel_key);

CREATE INDEX IF NOT EXISTS external_connections_tenant_provider_channel_key_connection_status_idx
  ON external_connections (tenant_id, provider, channel_key, connection_status);
