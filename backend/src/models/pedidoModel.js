const { query } = require('../config/db');

async function crear(empresaId, data) {
  const result = await query(
    `INSERT INTO pedidos (empresa_id, contacto_id, conversacion_id, estado, total, datos, direccion)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
     RETURNING *`,
    [
      empresaId,
      data.contacto_id || null,
      data.conversacion_id || null,
      data.estado || 'pendiente',
      Number(data.total) || 0,
      JSON.stringify(data.datos || {}),
      JSON.stringify(data.direccion || {}),
    ]
  );
  return result.rows[0];
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

async function actualizarEnvioDropi(id, empresaId, dropiId) {
  const result = await query(
    `UPDATE pedidos SET dropi_id = $2, dropi_enviado_at = now(), updated_at = now() WHERE id = $1 AND empresa_id = $3 RETURNING *`,
    [id, dropiId, empresaId]
  );
  return result.rows[0] || null;
}

async function actualizarEnvioMastershop(id, empresaId, mastershopId) {
  const result = await query(
    `UPDATE pedidos SET mastershop_id = $2, mastershop_enviado_at = now(), updated_at = now() WHERE id = $1 AND empresa_id = $3 RETURNING *`,
    [id, mastershopId, empresaId]
  );
  return result.rows[0] || null;
}

module.exports = { crear, listarPorEmpresa, getById, actualizarEnvioDropi, actualizarEnvioMastershop };
