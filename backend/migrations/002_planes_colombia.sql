-- Planes recomendados para Colombia (COP). Ejecutar en pgAdmin una vez.
-- Si tu tabla planes no tiene columna codigo como UNIQUE, añádela antes:
--   ALTER TABLE planes ADD CONSTRAINT planes_codigo_key UNIQUE (codigo);
-- Luego ejecuta este bloque. Si prefieres no usar ON CONFLICT, ejecuta solo los 3 INSERT sin la línea ON CONFLICT.

INSERT INTO planes (codigo, nombre, descripcion, precio_mensual, activo)
VALUES
  ('BASICO_MENSUAL', 'Básico', '1 usuario, CRM básico, Bot IA, WhatsApp Web/Cloud. Ideal para emprendedores y micropymes.', 39900, true),
  ('PROFESIONAL_MENSUAL', 'Profesional', 'Hasta 3 usuarios, contactos ilimitados, conversaciones, Bot IA y WhatsApp. Para equipos pequeños.', 89900, true),
  ('EMPRESARIAL_MENSUAL', 'Empresarial', 'Usuarios ilimitados, todo lo de Profesional, soporte prioritario y reportes avanzados.', 149900, true)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio_mensual = EXCLUDED.precio_mensual,
  activo = EXCLUDED.activo;
