-- Migrate users.id from UUID to TEXT for Firebase Auth compatibility

BEGIN;

-- Drop dependent tables first
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Recreate users table with TEXT id
CREATE TABLE users (
    id          text PRIMARY KEY,
    email       text NOT NULL UNIQUE,
    name        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Recreate memberships with TEXT user_id
CREATE TABLE memberships (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        text NOT NULL DEFAULT 'member',
    status      text NOT NULL DEFAULT 'active',
    invited_by  text REFERENCES users(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_memberships_user_id ON memberships (user_id);
CREATE INDEX idx_memberships_tenant_id ON memberships (tenant_id);

-- Recreate user_preferences with TEXT user_id
CREATE TABLE user_preferences (
    user_id             text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
    updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMIT;
