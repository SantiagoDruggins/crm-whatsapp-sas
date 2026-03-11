-- Guarda cuándo se envió el último reporte semanal por empresa
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS last_weekly_report_at TIMESTAMPTZ;

