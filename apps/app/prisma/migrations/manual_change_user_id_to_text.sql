-- Cambiar user_id de UUID a TEXT en todas las tablas

-- 1. Eliminar foreign key constraints temporalmente
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_user_id_fkey;
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
ALTER TABLE isaak_conversations DROP CONSTRAINT IF EXISTS isaak_conversations_user_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;

-- 2. Cambiar tipo en la tabla users
ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::text;

-- 3. Cambiar foreign keys en memberships
ALTER TABLE memberships ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 4. Cambiar foreign keys en user_preferences
ALTER TABLE user_preferences ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 5. Cambiar foreign keys en isaak_conversations
ALTER TABLE isaak_conversations ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 6. Cambiar foreign keys en invoices (created_by)
ALTER TABLE invoices ALTER COLUMN created_by TYPE TEXT USING created_by::text;

-- 7. Recrear foreign key constraints
ALTER TABLE memberships ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE isaak_conversations ADD CONSTRAINT isaak_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

