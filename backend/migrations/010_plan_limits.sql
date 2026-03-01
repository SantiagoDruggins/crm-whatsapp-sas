-- Límites por plan: max_contactos y max_usuarios (NULL = ilimitado)
ALTER TABLE planes ADD COLUMN IF NOT EXISTS max_contactos INTEGER;
ALTER TABLE planes ADD COLUMN IF NOT EXISTS max_usuarios INTEGER;

-- Plan demo (para empresas en demo_activa): límite bajo
INSERT INTO planes (codigo, nombre, descripcion, precio_mensual, duracion_dias, activo, max_contactos, max_usuarios)
VALUES ('demo', 'Demo', 'Prueba 3 días. Hasta 50 contactos, 1 usuario.', 0, 3, true, 50, 1)
ON CONFLICT (codigo) DO UPDATE SET max_contactos = 50, max_usuarios = 1;

-- Actualizar planes existentes con límites
UPDATE planes SET max_contactos = 500, max_usuarios = 1 WHERE codigo = 'BASICO_MENSUAL';
UPDATE planes SET max_contactos = 2000, max_usuarios = 3 WHERE codigo = 'PROFESIONAL_MENSUAL';
UPDATE planes SET max_contactos = NULL, max_usuarios = NULL WHERE codigo = 'EMPRESARIAL_MENSUAL';
