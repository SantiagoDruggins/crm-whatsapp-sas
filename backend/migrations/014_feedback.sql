-- Sugerencias / feedback de usuarios del panel (para mejora continua)
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'sugerencia',
  mensaje TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_empresa ON feedback (empresa_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback (created_at DESC);
