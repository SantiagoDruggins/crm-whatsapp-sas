-- Wompi suscripciones automáticas (payment sources + transacciones)
-- Mantiene multitenant por empresa_id y permite cobros recurrentes sin reingresar tarjeta.

CREATE TABLE IF NOT EXISTS wompi_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  plan_codigo VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active', -- active | past_due | canceled
  wompi_payment_source_id BIGINT,
  customer_email VARCHAR(255),
  next_charge_at TIMESTAMPTZ,
  last_transaction_id VARCHAR(120),
  last_transaction_status VARCHAR(50),
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wompi_sub_empresa ON wompi_subscriptions (empresa_id);
CREATE INDEX IF NOT EXISTS idx_wompi_sub_status ON wompi_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_wompi_sub_next_charge ON wompi_subscriptions (next_charge_at) WHERE next_charge_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS wompi_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES wompi_subscriptions (id) ON DELETE SET NULL,
  plan_codigo VARCHAR(50),
  wompi_transaction_id VARCHAR(120) NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'COP',
  status VARCHAR(50),
  reference VARCHAR(255),
  raw_event JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wompi_tx_wompi_id ON wompi_transactions (wompi_transaction_id);
CREATE INDEX IF NOT EXISTS idx_wompi_tx_empresa ON wompi_transactions (empresa_id);
CREATE INDEX IF NOT EXISTS idx_wompi_tx_sub ON wompi_transactions (subscription_id);
