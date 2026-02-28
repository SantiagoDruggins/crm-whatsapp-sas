-- Planes Colombia (COP) - Versión simple: solo INSERT. Ejecutar UNA vez en pgAdmin.
-- Si ya tienes planes con estos códigos, bórralos antes: DELETE FROM planes WHERE codigo IN ('BASICO_MENSUAL','PROFESIONAL_MENSUAL','EMPRESARIAL_MENSUAL');

INSERT INTO planes (codigo, nombre, descripcion, precio_mensual, activo)
VALUES
  ('BASICO_MENSUAL', 'Básico', '1 usuario, CRM básico, Bot IA, WhatsApp Web/Cloud. Ideal para emprendedores y micropymes.', 39900, true),
  ('PROFESIONAL_MENSUAL', 'Profesional', 'Hasta 3 usuarios, contactos ilimitados, conversaciones, Bot IA y WhatsApp. Para equipos pequeños.', 89900, true),
  ('EMPRESARIAL_MENSUAL', 'Empresarial', 'Usuarios ilimitados, todo lo de Profesional, soporte prioritario y reportes avanzados.', 149900, true);
