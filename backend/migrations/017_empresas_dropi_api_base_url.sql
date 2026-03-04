-- URL base de la API de Dropi por empresa (opcional). Si se rellena, se usa en lugar de DROPI_API_BASE_URL del servidor.
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS dropi_api_base_url TEXT;
