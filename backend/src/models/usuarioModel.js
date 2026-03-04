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

async function getById(userId) {
  const result = await query(
    `SELECT id, nombre, email, rol, empresa_id, is_active, last_login_at, created_at, updated_at
     FROM usuarios WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function actualizarLastLogin(userId) {
  await query(`UPDATE usuarios SET last_login_at = now() WHERE id = $1`, [userId]);
}

async function actualizarPerfil(userId, { nombre, email }) {
  const updates = [];
  const values = [];
  let i = 1;
  if (nombre !== undefined && String(nombre).trim()) {
    updates.push(`nombre = $${i++}`);
    values.push(String(nombre).trim());
  }
  if (email !== undefined && String(email).trim()) {
    const emailNorm = String(email).trim().toLowerCase();
    const otro = await query(`SELECT id FROM usuarios WHERE LOWER(email) = $1 AND id != $2`, [emailNorm, userId]);
    if (otro.rows.length > 0) return { error: 'Ya existe otro usuario con ese email' };
    updates.push(`email = $${i++}`);
    values.push(emailNorm);
  }
  if (updates.length === 0) return { row: await getById(userId) };
  values.push(userId);
  const result = await query(
    `UPDATE usuarios SET ${updates.join(', ')}, updated_at = now() WHERE id = $${i} RETURNING id, nombre, email, rol`,
    values
  );
  return { row: result.rows[0] || null };
}

async function actualizarPassword(userId, passwordHash) {
  await query(`UPDATE usuarios SET password_hash = $1, updated_at = now() WHERE id = $2`, [passwordHash, userId]);
}

module.exports = { crearUsuarioEmpresa, obtenerUsuarioPorEmailGlobal, actualizarLastLogin, getById, actualizarPerfil, actualizarPassword };
