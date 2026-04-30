-- Integración Shopify por empresa
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS shopify_store_url TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS shopify_access_token TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS shopify_activo BOOLEAN DEFAULT false;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS shopify_webhook_secret TEXT;

-- Pedidos: origen Shopify (para no duplicar por shopify_order_id)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS shopify_order_id VARCHAR(255);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado_shopify VARCHAR(50);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tags TEXT;
CREATE INDEX IF NOT EXISTS idx_pedidos_shopify_order ON pedidos (empresa_id, shopify_order_id) WHERE shopify_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pedidos_estado_shopify ON pedidos (empresa_id, estado_shopify) WHERE estado_shopify IS NOT NULL;
