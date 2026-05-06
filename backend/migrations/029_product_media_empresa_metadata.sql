-- Completa multimedia de producto con asociacion multiempresa y metadata.

ALTER TABLE product_media
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

UPDATE product_media pm
SET empresa_id = p.empresa_id
FROM productos p
WHERE pm.product_id = p.id
  AND pm.empresa_id IS NULL;

UPDATE product_media
SET filename = regexp_replace(url, '^.*/', '')
WHERE (filename IS NULL OR btrim(filename) = '')
  AND url IS NOT NULL
  AND btrim(url) <> '';

UPDATE product_media
SET thumbnail_url = url
WHERE type = 'image'
  AND (thumbnail_url IS NULL OR btrim(thumbnail_url) = '');

ALTER TABLE product_media
  ALTER COLUMN empresa_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_media_empresa_product
  ON product_media (empresa_id, product_id, order_index, created_at);
