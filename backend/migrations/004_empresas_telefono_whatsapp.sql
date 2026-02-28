-- Número de WhatsApp legible para mostrar en respuestas del bot (ej. +57 300 123 4567)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS telefono_whatsapp VARCHAR(50);
