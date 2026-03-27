-- WABA ID = entry.id en webhooks de Meta; permite enlazar mensajes si phone_number_id estaba desfasado (varios números en la misma cuenta).
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS whatsapp_waba_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_empresas_wa_waba ON empresas (whatsapp_waba_id) WHERE whatsapp_waba_id IS NOT NULL AND whatsapp_waba_id != '';
