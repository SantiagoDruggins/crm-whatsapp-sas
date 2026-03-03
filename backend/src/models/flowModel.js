const { query } = require('../config/db');

async function listarPorEmpresa(empresaId, { limit = 100, offset = 0 } = {}) {
  const result = await query(
    `SELECT * FROM flows WHERE empresa_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [empresaId, limit, offset]
  );
  return result.rows || [];
}

async function listarActivosPorEmpresa(empresaId) {
  const result = await query(
    `SELECT * FROM flows WHERE empresa_id = $1 AND activo = TRUE ORDER BY created_at ASC`,
    [empresaId]
  );
  return result.rows || [];
}

async function getById(empresaId, id) {
  const result = await query(`SELECT * FROM flows WHERE id = $1 AND empresa_id = $2`, [id, empresaId]);
  return result.rows[0] || null;
}

async function crear(empresaId, data) {
  const result = await query(
    `INSERT INTO flows (empresa_id, nombre, trigger_type, trigger_value, accion_tipo, accion_valor, activo)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE))
     RETURNING *`,
    [
      empresaId,
      data.nombre,
      data.trigger_type,
      data.trigger_value,
      data.accion_tipo,
      data.accion_valor,
      data.activo,
    ]
  );
  return result.rows[0];
}

async function actualizar(empresaId, id, data) {
  const campos = ['nombre', 'trigger_type', 'trigger_value', 'accion_tipo', 'accion_valor', 'activo'];
  const sets = [];
  const values = [id, empresaId];
  let idx = 3;
  for (const campo of campos) {
    if (data[campo] !== undefined) {
      sets.push(`${campo} = $${idx}`);
      values.push(data[campo]);
      idx += 1;
    }
  }
  if (!sets.length) return getById(empresaId, id);
  sets.push('created_at = created_at'); // mantener created_at, pero obliga a tener al menos un SET estático
  const result = await query(
    `UPDATE flows SET ${sets.join(', ')} WHERE id = $1 AND empresa_id = $2 RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function eliminar(empresaId, id) {
  const result = await query(`DELETE FROM flows WHERE id = $1 AND empresa_id = $2 RETURNING id`, [id, empresaId]);
  return result.rowCount > 0;
}

module.exports = {
  listarPorEmpresa,
  listarActivosPorEmpresa,
  getById,
  crear,
  actualizar,
  eliminar,
};

