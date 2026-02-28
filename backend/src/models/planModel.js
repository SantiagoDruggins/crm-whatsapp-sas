const { query } = require('../config/db');

async function listarActivos() {
  try {
    const result = await query(`SELECT * FROM planes WHERE activo = true ORDER BY precio_mensual ASC NULLS LAST`);
    return result.rows;
  } catch (e) {
    return [];
  }
}

async function getByCodigo(codigo) {
  const result = await query(`SELECT * FROM planes WHERE codigo = $1 AND activo = true LIMIT 1`, [codigo]);
  return result.rows[0] || null;
}

module.exports = { listarActivos, getByCodigo };
