-- Plan "marca blanca": pago único vía Wompi (COP). Sin renovación automática (next_charge_at NULL).
-- Precio COP es referencia ~500 USD: ajustar según TRM en producción (UPDATE planes SET precio_mensual = ...).

ALTER TABLE planes ADD COLUMN IF NOT EXISTS es_pago_unico BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS marca_blanca BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS marca_blanca_pagado_at TIMESTAMPTZ;

UPDATE planes SET es_pago_unico = false WHERE es_pago_unico IS NULL;

INSERT INTO planes (codigo, nombre, descripcion, precio_mensual, duracion_dias, activo, max_contactos, max_usuarios, es_pago_unico)
VALUES (
  'MARCA_BLANCA_USD',
  'Marca blanca (pago único)',
  'Licencia de ecosistema bajo tu marca: CRM + WhatsApp Cloud + IA. Cobro único en COP (referencia ~500 USD). Dominio y puesta en marcha según alcance acordado tras el pago.',
  2000000,
  36500,
  true,
  NULL,
  NULL,
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio_mensual = EXCLUDED.precio_mensual,
  duracion_dias = EXCLUDED.duracion_dias,
  activo = EXCLUDED.activo,
  max_contactos = EXCLUDED.max_contactos,
  max_usuarios = EXCLUDED.max_usuarios,
  es_pago_unico = EXCLUDED.es_pago_unico;
