-- Foto de contacto (subida en CRM o URL interna). WhatsApp Cloud no entrega la foto de perfil del usuario.
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(600);
