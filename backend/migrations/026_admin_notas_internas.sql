-- Notas internas solo visibles para super admin (detalle de empresa)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS admin_notas_internas TEXT;
