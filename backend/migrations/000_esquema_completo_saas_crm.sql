-- ============================================================
-- ChatProBusiness - Esquema completo PostgreSQL (Colombia)
-- Ejecutar en pgAdmin sobre la base de datos saas_crm_multitenant
-- ============================================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------
-- EMPRESAS
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'demo_activa',
  plan VARCHAR(50) DEFAULT 'demo',
  demo_expires_at TIMESTAMPTZ,
  fecha_expiracion TIMESTAMPTZ,
  whatsapp_cloud_access_token TEXT,
  whatsapp_cloud_phone_number_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresas_email ON empresas (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_empresas_wa_phone ON empresas (whatsapp_cloud_phone_number_id) WHERE whatsapp_cloud_phone_number_id IS NOT NULL AND whatsapp_cloud_phone_number_id != '';

-- ---------------------------------------------
-- USUARIOS (admin por empresa + super_admin sin empresa)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas (id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios (empresa_id);

-- ---------------------------------------------
-- PLANES
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS planes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio_mensual NUMERIC(12,2) NOT NULL DEFAULT 0,
  duracion_dias INTEGER DEFAULT 30,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------
-- PAGOS (Nequi - comprobante)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  plan VARCHAR(100) NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  metodo VARCHAR(50) DEFAULT 'nequi',
  comprobante_url VARCHAR(500),
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  referencia VARCHAR(255),
  fecha_pago TIMESTAMPTZ,
  aprobado_por UUID REFERENCES usuarios (id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_empresa ON pagos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos (estado);

-- ---------------------------------------------
-- CONTACTOS
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS contactos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL DEFAULT 'Sin nombre',
  apellidos VARCHAR(255),
  email VARCHAR(255),
  telefono VARCHAR(50),
  origen VARCHAR(50) DEFAULT 'manual',
  tags JSONB DEFAULT '[]'::jsonb,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contactos_empresa ON contactos (empresa_id);

-- ---------------------------------------------
-- CONVERSACIONES
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS conversaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  contacto_id UUID NOT NULL REFERENCES contactos (id) ON DELETE CASCADE,
  canal VARCHAR(50) DEFAULT 'whatsapp',
  estado VARCHAR(50) DEFAULT 'abierta',
  asignado_a UUID REFERENCES usuarios (id),
  ultimo_mensaje_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversaciones_empresa ON conversaciones (empresa_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_contacto ON conversaciones (contacto_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversaciones_empresa_contacto_canal ON conversaciones (empresa_id, contacto_id, canal);

-- ---------------------------------------------
-- MENSAJES
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS mensajes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  conversacion_id UUID NOT NULL REFERENCES conversaciones (id) ON DELETE CASCADE,
  origen VARCHAR(50) DEFAULT 'cliente',
  usuario_id UUID REFERENCES usuarios (id),
  contenido TEXT NOT NULL,
  es_entrada BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON mensajes (conversacion_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_empresa ON mensajes (empresa_id);

-- ---------------------------------------------
-- BOTS (IA por empresa)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL DEFAULT 'Bot IA',
  descripcion TEXT,
  prompt_base TEXT NOT NULL,
  canal VARCHAR(50) DEFAULT 'whatsapp',
  estado VARCHAR(50) DEFAULT 'activo',
  tipo VARCHAR(50) DEFAULT 'general',
  conocimiento JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bots_empresa ON bots (empresa_id);

-- ============================================================
-- SEED: Planes recomendados Colombia (COP)
-- ============================================================
INSERT INTO planes (codigo, nombre, descripcion, precio_mensual, duracion_dias, activo)
VALUES
  ('BASICO_MENSUAL', 'Básico', '1 usuario, CRM básico, Bot IA, WhatsApp Cloud API. Ideal para emprendedores y micropymes.', 39900, 30, true),
  ('PROFESIONAL_MENSUAL', 'Profesional', 'Hasta 3 usuarios, contactos ilimitados, conversaciones, Bot IA y WhatsApp. Para equipos pequeños.', 89900, 30, true),
  ('EMPRESARIAL_MENSUAL', 'Empresarial', 'Usuarios ilimitados, todo lo de Profesional, soporte prioritario y reportes avanzados.', 149900, 30, true)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio_mensual = EXCLUDED.precio_mensual,
  duracion_dias = EXCLUDED.duracion_dias,
  activo = EXCLUDED.activo;

-- Fin del esquema
