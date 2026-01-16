-- Migration: 005_add_conversation_sharing.sql
-- Añade tabla para enlaces compartidos de conversaciones de Isaak
-- 
-- Características:
-- - Enlace temporal (24h por defecto)
-- - Sin necesidad de login
-- - Opcional: requiere password
-- - Tracking de accesos

CREATE TABLE IF NOT EXISTS isaak_conversation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES isaak_conversations(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE, -- Token único para el enlace
  password_hash TEXT, -- Optional: hash bcrypt si requiere password
  expires_at TIMESTAMPTZ NOT NULL, -- Fecha de expiración
  access_count INT DEFAULT 0, -- Contador de accesos
  last_accessed_at TIMESTAMPTZ, -- Último acceso
  created_by TEXT NOT NULL, -- Usuario que creó el share
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Índices
CREATE INDEX idx_conversation_shares_token ON isaak_conversation_shares(share_token);
CREATE INDEX idx_conversation_shares_conversation ON isaak_conversation_shares(conversation_id);
CREATE INDEX idx_conversation_shares_expires ON isaak_conversation_shares(expires_at);

-- Limpieza automática (opcional, para ejecutar periódicamente)
-- DELETE FROM isaak_conversation_shares WHERE expires_at < NOW();
