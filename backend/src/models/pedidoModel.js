const { query } = require('../config/db');

async function crear(empresaId, data) {
  const result = await query(
    `INSERT INTO pedidos (empresa_id, contacto_id, conversacion_id, estado, total, datos, direccion, shopify_order_id, estado_shopify, tags)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
     RETURNING *`,
    [
      empresaId,
      data.contacto_id || null,
      data.conversacion_id || null,
      data.estado || 'pendiente',
      Number(data.total) || 0,
      JSON.stringify(data.datos || {}),
      JSON.stringify(data.direccion || {}),
      data.shopify_order_id || null,
      data.estado_shopify || null,
      data.tags || null,
    ]
  );
  return result.rows[0];
}

async function getByShopifyOrderId(empresaId, shopifyOrderId) {
  if (!shopifyOrderId) return null;
  const result = await query(
    `SELECT id FROM pedidos WHERE empresa_id = $1 AND shopify_order_id = $2 LIMIT 1`,
    [empresaId, String(shopifyOrderId)]
  );
  return result.rows[0] || null;
}

async function listarPorEmpresa(empresaId, { limit = 50, offset = 0 } = {}) {
  const result = await query(
    `SELECT p.*, c.nombre AS contacto_nombre, c.telefono AS contacto_telefono, c.email AS contacto_email
     FROM pedidos p
     LEFT JOIN contactos c ON c.id = p.contacto_id
     WHERE p.empresa_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [empresaId, limit, offset]
  );
  return result.rows;
}

async function getRecientePorConversacionProducto(empresaId, conversacionId, productoId, { minutos = 15 } = {}) {
  if (!empresaId || !conversacionId || !productoId) return null;
  const mins = Number(minutos) || 15;
  const result = await query(
    `SELECT id, created_at
     FROM pedidos
     WHERE empresa_id = $1
       AND conversacion_id = $2
       AND (datos->>'producto_id') = $3
       AND created_at >= (now() - ($4 || ' minutes')::interval)
     ORDER BY created_at DESC
     LIMIT 1`,
    [empresaId, conversacionId, String(productoId), String(mins)]
  );
  return result.rows[0] || null;
}

async function getById(empresaId, id) {
  const result = await query(
    `SELECT p.*, c.nombre AS contacto_nombre, c.apellidos AS contacto_apellidos, c.telefono AS contacto_telefono, c.email AS contacto_email
     FROM pedidos p
     LEFT JOIN contactos c ON c.id = p.contacto_id
     WHERE p.id = $1 AND p.empresa_id = $2`,
    [id, empresaId]
  );
  return result.rows[0] || null;
}

async function existePorConversacion(empresaId, conversacionId) {
  if (!empresaId || !conversacionId) return false;
  const result = await query(
    `SELECT id FROM pedidos WHERE empresa_id = $1 AND conversacion_id = $2 LIMIT 1`,
    [empresaId, conversacionId]
  );
  return !!result.rows[0];
}

async function actualizarShopify(empresaId, id, data = {}) {
  const updates = [];
  const values = [id, empresaId];
  let idx = 3;

  if (data.shopify_order_id !== undefined) {
    updates.push(`shopify_order_id = $${idx}`);
    values.push(data.shopify_order_id || null);
    idx++;
  }
  if (data.estado_shopify !== undefined) {
    updates.push(`estado_shopify = $${idx}`);
    values.push(data.estado_shopify || null);
    idx++;
  }
  if (data.tags !== undefined) {
    updates.push(`tags = $${idx}`);
    values.push(data.tags || null);
    idx++;
  }
  if (data.estado !== undefined) {
    updates.push(`estado = $${idx}`);
    values.push(data.estado || 'pendiente');
    idx++;
  }
  if (data.datos !== undefined) {
    updates.push(`datos = COALESCE(datos, '{}'::jsonb) || $${idx}::jsonb`);
    values.push(JSON.stringify(data.datos || {}));
    idx++;
  }

  if (updates.length === 0) return getById(empresaId, id);
  updates.push('updated_at = now()');

  const result = await query(
    `UPDATE pedidos SET ${updates.join(', ')} WHERE id = $1 AND empresa_id = $2 RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

module.exports = { crear, listarPorEmpresa, getRecientePorConversacionProducto, existePorConversacion, getById, getByShopifyOrderId, actualizarShopify };
