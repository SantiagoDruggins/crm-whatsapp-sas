const { query } = require('../config/db');

async function crearUsuarioEmpresa({ empresaId, nombre, email, passwordHash, rol = 'admin', crmRoleId = null }) {
  const result = await query(
    `
    INSERT INTO usuarios (empresa_id, nombre, email, password_hash, rol, is_active, crm_role_id)
    VALUES ($1, $2, LOWER(TRIM($3)), $4, $5, TRUE, $6) RETURNING *
  `,
    [empresaId, nombre, email, passwordHash, rol, crmRoleId]
  );
  return result.rows[0];
}

async function obtenerUsuarioPorEmailGlobal(email) {
  const result = await query(
    `SELECT u.*, cr.permisos AS crm_permisos, cr.is_full_access AS crm_is_full_access
     FROM usuarios u
     LEFT JOIN crm_roles cr ON cr.id = u.crm_role_id
     WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );
  return result.rows[0] || null;
}

async function getById(userId) {
  const result = await query(
    `SELECT id, nombre, email, rol, empresa_id, is_active, last_login_at, created_at, updated_at, crm_role_id
     FROM usuarios WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getByIdConCrm(userId) {
  const result = await query(
    `SELECT u.id, u.nombre, u.email, u.rol, u.empresa_id, u.is_active, u.last_login_at, u.created_at, u.updated_at, u.crm_role_id,
            cr.permisos AS crm_permisos, cr.is_full_access AS crm_is_full_access
     FROM usuarios u
     LEFT JOIN crm_roles cr ON cr.id = u.crm_role_id
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function listarPorEmpresa(empresaId) {
  const result = await query(
    `SELECT u.id, u.nombre, u.email, u.rol, u.is_active, u.crm_role_id, u.last_login_at, u.created_at,
            r.nombre AS crm_rol_nombre, r.is_full_access AS crm_rol_full_access
     FROM usuarios u
     LEFT JOIN crm_roles r ON r.id = u.crm_role_id
     WHERE u.empresa_id = $1
     ORDER BY u.created_at ASC`,
    [empresaId]
  );
  return result.rows;
}

async function contarActivosPorEmpresa(empresaId) {
  const result = await query(
    `SELECT COUNT(*)::int AS n FROM usuarios WHERE empresa_id = $1 AND is_active = true`,
    [empresaId]
  );
  return result.rows[0]?.n || 0;
}

async function obtenerPorIdEmpresa(userId, empresaId) {
  const result = await query(`SELECT * FROM usuarios WHERE id = $1 AND empresa_id = $2`, [userId, empresaId]);
  return result.rows[0] || null;
}

async function actualizarUsuarioEmpresa(userId, empresaId, { nombre, email, crm_role_id, is_active }) {
  const row = await obtenerPorIdEmpresa(userId, empresaId);
  if (!row) return { error: 'Usuario no encontrado' };
  const updates = [];
  const vals = [];
  let i = 1;
  if (nombre !== undefined && String(nombre).trim()) {
    updates.push(`nombre = $${i++}`);
    vals.push(String(nombre).trim());
  }
  if (email !== undefined && String(email).trim()) {
    const emailNorm = String(email).trim().toLowerCase();
    const otro = await query(`SELECT id FROM usuarios WHERE LOWER(email) = $1 AND id != $2`, [emailNorm, userId]);
    if (otro.rows.length > 0) return { error: 'Ya existe otro usuario con ese email' };
    updates.push(`email = $${i++}`);
    vals.push(emailNorm);
  }
  if (crm_role_id !== undefined) {
    updates.push(`crm_role_id = $${i++}`);
    vals.push(crm_role_id || null);
  }
  if (is_active !== undefined) {
    updates.push(`is_active = $${i++}`);
    vals.push(!!is_active);
  }
  if (updates.length === 0) return { row: await getById(userId) };
  vals.push(userId, empresaId);
  await query(
    `UPDATE usuarios SET ${updates.join(', ')}, updated_at = now() WHERE id = $${i++} AND empresa_id = $${i}`,
    vals
  );
  return { row: await getById(userId) };
}

async function establecerPassword(userId, passwordHash) {
  await query(`UPDATE usuarios SET password_hash = $1, updated_at = now() WHERE id = $2`, [passwordHash, userId]);
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

module.exports = {
  crearUsuarioEmpresa,
  obtenerUsuarioPorEmailGlobal,
  actualizarLastLogin,
  getById,
  getByIdConCrm,
  actualizarPerfil,
  actualizarPassword,
  listarPorEmpresa,
  contarActivosPorEmpresa,
  obtenerPorIdEmpresa,
  actualizarUsuarioEmpresa,
  establecerPassword,
};
