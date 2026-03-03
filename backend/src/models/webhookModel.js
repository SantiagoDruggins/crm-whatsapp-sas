const { query } = require('../config/db');

async function listarPorEmpresa(empresaId, { limit = 100, offset = 0 } = {}) {
  const result = await query(
    `SELECT * FROM webhooks WHERE empresa_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [empresaId, limit, offset]
  );
  return result.rows || [];
}

async function listarActivosPorEvento(empresaId, evento) {
  const result = await query(
    `SELECT * FROM webhooks WHERE empresa_id = $1 AND evento = $2 AND activo = TRUE ORDER BY created_at ASC`,
    [empresaId, evento]
  );
  return result.rows || [];
}

async function getById(empresaId, id) {
  const result = await query(`SELECT * FROM webhooks WHERE id = $1 AND empresa_id = $2`, [id, empresaId]);
  return result.rows[0] || null;
}

async function crear(empresaId, data) {
  const result = await query(
    `INSERT INTO webhooks (empresa_id, nombre, evento, url, headers, activo)
     VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), COALESCE($6, TRUE))
     RETURNING *`,
    [
      empresaId,
      data.nombre,
      data.evento,
      data.url,
      data.headers || {},
      data.activo,
    ]
  );
  return result.rows[0] || null;
}

async function actualizar(empresaId, id, data) {
  const campos = ['nombre', 'evento', 'url', 'headers', 'activo'];
  const sets = [];
  const values = [id, empresaId];
  let idx = 3;
  for (const campo of campos) {
    if (data[campo] !== undefined) {
      if (campo === 'headers') {
        sets.push(`headers = COALESCE($${idx}::jsonb, headers)`);
      } else {
        sets.push(`${campo} = $${idx}`);
      }
      values.push(campo === 'headers' ? JSON.stringify(data[campo]) : data[campo]);
      idx += 1;
    }
  }
  if (!sets.length) return getById(empresaId, id);
  const result = await query(
    `UPDATE webhooks SET ${sets.join(', ')} WHERE id = $1 AND empresa_id = $2 RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function eliminar(empresaId, id) {
  const result = await query(`DELETE FROM webhooks WHERE id = $1 AND empresa_id = $2 RETURNING id`, [id, empresaId]);
  return result.rowCount > 0;
}

module.exports = {
  listarPorEmpresa,
  listarActivosPorEvento,
  getById,
  crear,
  actualizar,
  eliminar,
};

