-- Credenciales de WhatsApp Cloud API por empresa (cada cliente configura la suya)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS whatsapp_cloud_access_token TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS whatsapp_cloud_phone_number_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_empresas_wa_phone ON empresas (whatsapp_cloud_phone_number_id) WHERE whatsapp_cloud_phone_number_id IS NOT NULL AND whatsapp_cloud_phone_number_id != '';
