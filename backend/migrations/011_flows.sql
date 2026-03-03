-- Flujos / Automatizaciones básicas por empresa
-- Version 1: reglas simples antes de llamar a la IA

CREATE TABLE IF NOT EXISTS flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'keyword' | 'lead_status' | 'tag'
  trigger_value TEXT NOT NULL,
  accion_tipo TEXT NOT NULL, -- 'mensaje' | 'tag' | 'cambiar_estado'
  accion_valor TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flows_empresa_activo
  ON flows (empresa_id, activo);

