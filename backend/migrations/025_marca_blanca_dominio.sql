-- Dominio y nombre público para marca blanca (gestión super admin + futuro routing por host)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS marca_blanca_dominio VARCHAR(255);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS marca_blanca_nombre_publico VARCHAR(255);
