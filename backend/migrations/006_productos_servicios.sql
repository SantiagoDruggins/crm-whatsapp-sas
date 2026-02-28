-- Catálogo de productos / servicios por empresa
-- Ejecutar después de 000_esquema_completo_saas_crm.sql

CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda VARCHAR(10) NOT NULL DEFAULT 'COP',
  tipo VARCHAR(50) NOT NULL DEFAULT 'producto', -- producto | servicio
  imagen_url VARCHAR(500),
  tags JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_productos_empresa ON productos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_productos_empresa_activo ON productos (empresa_id) WHERE activo = true;

