const { query } = require('../config/db');

async function listar(empresaId, { limit = 100, offset = 0 } = {}) {
  const result = await query(
    `SELECT * FROM productos WHERE empresa_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [empresaId, limit, offset]
  );
  return result.rows || [];
}

async function listarActivos(empresaId, { limit = 100, offset = 0 } = {}) {
  const result = await query(
    `SELECT * FROM productos WHERE empresa_id = $1 AND activo = true ORDER BY nombre ASC LIMIT $2 OFFSET $3`,
    [empresaId, limit, offset]
  );
  return result.rows || [];
}

async function obtener(empresaId, id) {
  const result = await query(`SELECT * FROM productos WHERE id = $1 AND empresa_id = $2`, [id, empresaId]);
  return result.rows[0] || null;
}

async function crear(empresaId, data) {
  const result = await query(
    `INSERT INTO productos (empresa_id, nombre, descripcion, precio, moneda, tipo, imagen_url, tags, activo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, COALESCE($9, true))
     RETURNING *`,
    [
      empresaId,
      data.nombre,
      data.descripcion || null,
      Number(data.precio) || 0,
      data.moneda || 'COP',
      data.tipo || 'producto',
      data.imagen_url || null,
      Array.isArray(data.tags) ? JSON.stringify(data.tags) : '[]',
      data.activo !== undefined ? !!data.activo : true,
    ]
  );
  return result.rows[0] || null;
}

async function actualizar(empresaId, id, data) {
  const result = await query(
    `UPDATE productos
       SET nombre = COALESCE($3, nombre),
           descripcion = COALESCE($4, descripcion),
           precio = COALESCE($5, precio),
           moneda = COALESCE($6, moneda),
           tipo = COALESCE($7, tipo),
           imagen_url = COALESCE($8, imagen_url),
           tags = COALESCE($9::jsonb, tags),
           activo = COALESCE($10, activo),
           updated_at = now()
     WHERE id = $1 AND empresa_id = $2
     RETURNING *`,
    [
      id,
      empresaId,
      data.nombre || null,
      data.descripcion !== undefined ? data.descripcion : null,
      data.precio !== undefined ? Number(data.precio) : null,
      data.moneda || null,
      data.tipo || null,
      data.imagen_url !== undefined ? data.imagen_url : null,
      Array.isArray(data.tags) ? JSON.stringify(data.tags) : null,
      data.activo !== undefined ? !!data.activo : null,
    ]
  );
  return result.rows[0] || null;
}

async function desactivar(empresaId, id) {
  const result = await query(
    `UPDATE productos SET activo = false, updated_at = now() WHERE id = $1 AND empresa_id = $2 RETURNING *`,
    [id, empresaId]
  );
  return result.rows[0] || null;
}

module.exports = { listar, listarActivos, obtener, crear, actualizar, desactivar };

