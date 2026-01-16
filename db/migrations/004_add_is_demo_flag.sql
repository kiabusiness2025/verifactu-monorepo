-- Migration: Add is_demo flag to tenants
-- Date: 2026-01-16
-- Purpose: Marcar empresas de demostración para excluirlas del admin panel

-- Add is_demo flag
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_tenants_demo 
ON tenants(is_demo);

-- Add comment
COMMENT ON COLUMN tenants.is_demo IS 
'Indica si el tenant es una empresa de demostración compartida (no cuenta como cliente real en métricas)';

-- Marcar "Empresa Demo SL" como demo si existe
UPDATE tenants 
SET is_demo = TRUE 
WHERE name = 'Empresa Demo SL';
