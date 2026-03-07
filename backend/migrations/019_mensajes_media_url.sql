-- Permite guardar URL del audio (y otros medios) para reproducir en el panel CRM
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS media_url TEXT;
