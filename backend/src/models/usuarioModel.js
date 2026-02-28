const { query } = require('../config/db');

async function crearUsuarioEmpresa({ empresaId, nombre, email, passwordHash, rol = 'admin' }) {
  const result = await query(`
    INSERT INTO usuarios (empresa_id, nombre, email, password_hash, rol, is_active)
    VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *
  `, [empresaId, nombre, email, passwordHash, rol]);
  return result.rows[0];
}

async function obtenerUsuarioPorEmailGlobal(email) {
  const result = await query(`SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)`, [email]);
  return result.rows[0] || null;
}

async function actualizarLastLogin(userId) {
  await query(`UPDATE usuarios SET last_login_at = now() WHERE id = $1`, [userId]);
}

module.exports = { crearUsuarioEmpresa, obtenerUsuarioPorEmailGlobal, actualizarLastLogin };
