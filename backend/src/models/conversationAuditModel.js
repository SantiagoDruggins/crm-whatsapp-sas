const { query } = require('../config/db');

async function crear(empresaId, data) {
  const result = await query(
    `INSERT INTO conversation_audit
       (empresa_id, chat_id, conversacion_id, contacto_id, resultado_ia, alerta_generada, pedido_creado)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
     RETURNING *`,
    [
      empresaId,
      data.chat_id,
      data.conversacion_id || null,
      data.contacto_id || null,
      JSON.stringify(data.resultado_ia || {}),
      !!data.alerta_generada,
      !!data.pedido_creado,
    ]
  );
  return result.rows[0] || null;
}

async function listar(empresaId, { limit = 50, offset = 0 } = {}) {
  const result = await query(
    `SELECT a.*, c.nombre AS contacto_nombre, c.telefono AS contacto_telefono,
            conv.ultimo_mensaje_at,
            EXISTS (
              SELECT 1 FROM pedidos p
              WHERE p.empresa_id = a.empresa_id AND p.conversacion_id = a.conversacion_id
            ) AS existe_pedido
     FROM conversation_audit a
     LEFT JOIN contactos c ON c.id = a.contacto_id AND c.empresa_id = a.empresa_id
     LEFT JOIN conversaciones conv ON conv.id = a.conversacion_id AND conv.empresa_id = a.empresa_id
     WHERE a.empresa_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [empresaId, limit, offset]
  );
  return result.rows || [];
}

async function marcarPedidoCreado(empresaId, id) {
  const result = await query(
    `UPDATE conversation_audit
     SET pedido_creado = true
     WHERE id = $1 AND empresa_id = $2
     RETURNING *`,
    [id, empresaId]
  );
  return result.rows[0] || null;
}

async function obtener(empresaId, id) {
  const result = await query(
    `SELECT * FROM conversation_audit WHERE id = $1 AND empresa_id = $2`,
    [id, empresaId]
  );
  return result.rows[0] || null;
}

module.exports = { crear, listar, obtener, marcarPedidoCreado };
