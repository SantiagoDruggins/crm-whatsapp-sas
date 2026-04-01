-- Programa de referidos: código por empresa + relación referido -> creador
CREATE TABLE IF NOT EXISTS affiliate_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
  code VARCHAR(40) NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_id UUID NOT NULL REFERENCES affiliate_codes(id) ON DELETE CASCADE,
  empresa_referida_id UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
  estado VARCHAR(20) NOT NULL DEFAULT 'registrado', -- registrado | pagado | recompensado
  reward_days INTEGER NOT NULL DEFAULT 0,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_codes_code ON affiliate_codes (code);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_codigo ON affiliate_referrals (codigo_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_estado ON affiliate_referrals (estado);
