-- Aviso en CRM cuando el cliente pide hablar con una persona/agente real
ALTER TABLE conversaciones
  ADD COLUMN IF NOT EXISTS pide_agente_humano BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pide_agente_humano_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversaciones_pide_agente ON conversaciones (empresa_id) WHERE pide_agente_humano = true;
