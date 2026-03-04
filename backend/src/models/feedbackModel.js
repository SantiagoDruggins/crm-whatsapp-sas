const { query } = require('../config/db');

async function crear(empresaId, { usuarioId, tipo, mensaje }) {
  const result = await query(
    `INSERT INTO feedback (empresa_id, usuario_id, tipo, mensaje)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [empresaId, usuarioId || null, tipo || 'sugerencia', (mensaje || '').trim()]
  );
  return result.rows[0];
}

async function listarParaAdmin({ limit = 100, offset = 0, tipo } = {}) {
  let sql = `
    SELECT f.*, e.nombre AS empresa_nombre, e.email AS empresa_email,
           u.nombre AS usuario_nombre, u.email AS usuario_email
    FROM feedback f
    LEFT JOIN empresas e ON e.id = f.empresa_id
    LEFT JOIN usuarios u ON u.id = f.usuario_id
    WHERE 1=1`;
  const values = [];
  let idx = 1;
  if (tipo && tipo.trim()) {
    sql += ` AND f.tipo = $${idx}`;
    values.push(tipo.trim());
    idx++;
  }
  sql += ` ORDER BY f.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
  values.push(limit, offset);
  const result = await query(sql, values);
  return result.rows;
}

module.exports = { crear, listarParaAdmin };
