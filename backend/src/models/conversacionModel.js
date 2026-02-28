const { query } = require('../config/db');

async function listar(empresaId, { limit = 50, offset = 0 } = {}) {
  try {
    const result = await query(`SELECT * FROM conversaciones WHERE empresa_id = $1 ORDER BY ultimo_mensaje_at DESC NULLS LAST LIMIT $2 OFFSET $3`, [empresaId, limit, offset]);
    return result.rows;
  } catch (e) {
    return [];
  }
}

async function getById(empresaId, id) {
  const result = await query(`SELECT * FROM conversaciones WHERE id = $1 AND empresa_id = $2`, [id, empresaId]);
  return result.rows[0] || null;
}

async function actualizar(empresaId, id, data) {
  const result = await query(`UPDATE conversaciones SET estado = COALESCE($2, estado), asignado_a = COALESCE($3, asignado_a), updated_at = now() WHERE id = $1 AND empresa_id = $4 RETURNING *`, [id, data.estado, data.asignado_a, empresaId]);
  return result.rows[0] || null;
}

async function actualizarUltimoMensaje(id) {
  await query(`UPDATE conversaciones SET ultimo_mensaje_at = now() WHERE id = $1`, [id]);
}

module.exports = { listar, getById, actualizar, actualizarUltimoMensaje, getOrCreate: async (e, c, canal, opts) => { const r = await query(`SELECT * FROM conversaciones WHERE empresa_id = $1 AND contacto_id = $2 AND canal = $3 LIMIT 1`, [e, c, canal || 'whatsapp']); if (r.rows[0]) return r.rows[0]; const ins = await query(`INSERT INTO conversaciones (empresa_id, contacto_id, canal, estado) VALUES ($1, $2, $3, 'abierta') RETURNING *`, [e, c, canal || 'whatsapp']); return ins.rows[0]; } };
