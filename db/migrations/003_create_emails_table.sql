-- ============================================
-- Migración: Sistema de Emails para Admin
-- Fecha: 2026-01-18
-- Descripción: Almacena emails entrantes de soporte@verifactu.business
-- ============================================

-- Tabla principal de emails
CREATE TABLE IF NOT EXISTS admin_emails (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Datos del email
    message_id      text UNIQUE NOT NULL,           -- ID de Resend
    from_email      text NOT NULL,                   -- Remitente
    from_name       text,                            -- Nombre del remitente
    to_email        text NOT NULL,                   -- Destinatario (soporte@verifactu.business)
    subject         text NOT NULL,                   -- Asunto
    text_content    text,                            -- Contenido en texto plano
    html_content    text,                            -- Contenido HTML
    
    -- Metadata
    priority        text NOT NULL DEFAULT 'normal',  -- 'low', 'normal', 'high'
    status          text NOT NULL DEFAULT 'pending', -- 'pending', 'responded', 'archived', 'spam'
    tags            text[],                          -- Tags para categorización
    
    -- Resend metadata
    resend_data     jsonb,                           -- Datos completos de Resend
    
    -- Tracking
    received_at     timestamptz NOT NULL DEFAULT now(),
    responded_at    timestamptz,
    responded_by    text REFERENCES users(id),       -- Usuario admin que respondió
    archived_at     timestamptz,
    
    -- Timestamps
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_admin_emails_status ON admin_emails(status);
CREATE INDEX IF NOT EXISTS idx_admin_emails_priority ON admin_emails(priority);
CREATE INDEX IF NOT EXISTS idx_admin_emails_received_at ON admin_emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_emails_from_email ON admin_emails(from_email);
CREATE INDEX IF NOT EXISTS idx_admin_emails_message_id ON admin_emails(message_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_admin_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_emails_updated_at
    BEFORE UPDATE ON admin_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_emails_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE admin_emails IS 'Almacena emails entrantes recibidos en soporte@verifactu.business vía webhook de Resend';
COMMENT ON COLUMN admin_emails.message_id IS 'ID único proporcionado por Resend para cada email';
COMMENT ON COLUMN admin_emails.priority IS 'Prioridad del email: low, normal, high (detectada automáticamente)';
COMMENT ON COLUMN admin_emails.status IS 'Estado del email: pending (sin responder), responded (respondido), archived (archivado), spam (marcado como spam)';
COMMENT ON COLUMN admin_emails.resend_data IS 'Datos completos del webhook de Resend en formato JSON';
