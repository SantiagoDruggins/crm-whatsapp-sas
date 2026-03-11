-- Modelos IA por tarea (solo admin). Defaults se aplican en código si quedan NULL.
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ai_model_router TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ai_model_support TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ai_model_pedidos TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ai_model_agenda TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ai_model_transcribe TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS ai_model_tts TEXT;

