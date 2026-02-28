-- Pedidos (para dropshippers: enviar a Dropi / Mastershop)
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  contacto_id UUID REFERENCES contactos (id) ON DELETE SET NULL,
  conversacion_id UUID REFERENCES conversaciones (id) ON DELETE SET NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  datos JSONB DEFAULT '{}'::jsonb,
  direccion JSONB DEFAULT '{}'::jsonb,
  dropi_id VARCHAR(255),
  dropi_enviado_at TIMESTAMPTZ,
  mastershop_id VARCHAR(255),
  mastershop_enviado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_empresa ON pedidos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos (estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_created ON pedidos (created_at DESC);

-- Integraciones Dropi y Mastershop por empresa
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS dropi_token TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS dropi_activo BOOLEAN DEFAULT false;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS mastershop_token TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS mastershop_activo BOOLEAN DEFAULT false;
