-- Add logo_url column to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN tenants.logo_url IS 'URL del logotipo de la empresa (Firebase Storage)';
