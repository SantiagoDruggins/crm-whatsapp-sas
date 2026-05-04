-- Multimedia por producto + auditoria IA de conversaciones

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_media_type') THEN
    CREATE TYPE product_media_type AS ENUM ('image', 'video');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS product_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES productos (id) ON DELETE CASCADE,
  type product_media_type NOT NULL,
  url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_media_product ON product_media (product_id, order_index, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_media_primary ON product_media (product_id) WHERE is_primary = true;

INSERT INTO product_media (product_id, type, url, is_primary, order_index)
SELECT p.id, 'image'::product_media_type, p.imagen_url, true, 0
FROM productos p
WHERE p.imagen_url IS NOT NULL
  AND btrim(p.imagen_url) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM product_media pm WHERE pm.product_id = p.id
  );

CREATE TABLE IF NOT EXISTS conversation_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas (id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  conversacion_id UUID REFERENCES conversaciones (id) ON DELETE SET NULL,
  contacto_id UUID REFERENCES contactos (id) ON DELETE SET NULL,
  resultado_ia JSONB NOT NULL DEFAULT '{}'::jsonb,
  alerta_generada BOOLEAN NOT NULL DEFAULT false,
  pedido_creado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_audit_empresa ON conversation_audit (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_audit_conversacion ON conversation_audit (empresa_id, conversacion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_audit_alerta ON conversation_audit (empresa_id, alerta_generada, created_at DESC);
