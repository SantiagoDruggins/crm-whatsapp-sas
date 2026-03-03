-- Tabla para webhooks salientes (para Zapier, Make, Pabbly, etc.)
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  evento TEXT NOT NULL, -- nuevo_pedido, nueva_cita, nuevo_contacto, nuevo_lead, etc.
  url TEXT NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_empresa_evento
  ON webhooks (empresa_id, evento)
  WHERE activo = TRUE;

