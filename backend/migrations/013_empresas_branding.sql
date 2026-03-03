-- Branding por empresa: logo en el panel
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

