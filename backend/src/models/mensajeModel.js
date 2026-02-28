const { query } = require('../config/db');

async function crear(empresaId, conversacionId, data) {
  const result = await query(`INSERT INTO mensajes (empresa_id, conversacion_id, origen, usuario_id, contenido, es_entrada) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [empresaId, conversacionId, data.origen || 'cliente', data.usuarioId, data.contenido, data.esEntrada !== false]);
  return result.rows[0];
}

async function listarPorConversacion(empresaId, conversacionId, { limit = 100, offset = 0 } = {}) {
  const result = await query(`SELECT * FROM mensajes WHERE conversacion_id = $1 AND empresa_id = $2 ORDER BY created_at ASC LIMIT $3 OFFSET $4`, [conversacionId, empresaId, limit, offset]);
  return result.rows;
}

module.exports = { crear, listarPorConversacion };
