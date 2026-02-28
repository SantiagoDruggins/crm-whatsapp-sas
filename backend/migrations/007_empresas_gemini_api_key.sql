-- Clave de IA (Gemini) opcional por empresa. Si no la tiene, se usa la del servidor (plan por defecto).
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
