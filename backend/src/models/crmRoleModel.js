const { query } = require('../config/db');
const { normalizePermisos } = require('../lib/crmPermissions');

async function crearRolAdminInicial(empresaId) {
  const ex = await query(`SELECT * FROM crm_roles WHERE empresa_id = $1 AND is_full_access = true LIMIT 1`, [empresaId]);
  if (ex.rows[0]) return ex.rows[0];
  const r = await query(
    `INSERT INTO crm_roles (empresa_id, nombre, permisos, is_full_access) VALUES ($1, 'Administrador', '{}'::jsonb, true) RETURNING *`,
    [empresaId]
  );
  return r.rows[0];
}

async function listarPorEmpresa(empresaId) {
  const r = await query(
    `SELECT id, empresa_id, nombre, permisos, is_full_access, created_at, updated_at FROM crm_roles WHERE empresa_id = $1 ORDER BY is_full_access DESC, nombre ASC`,
    [empresaId]
  );
  return r.rows;
}

async function obtenerPorId(id, empresaId) {
  const r = await query(`SELECT * FROM crm_roles WHERE id = $1 AND empresa_id = $2`, [id, empresaId]);
  return r.rows[0] || null;
}

async function crear(empresaId, { nombre, permisos, is_full_access }) {
  const nom = String(nombre || '').trim();
  if (!nom) throw new Error('El nombre del rol es requerido');
  const full = !!is_full_access;
  const perms = full ? {} : normalizePermisos(permisos);
  const r = await query(
    `INSERT INTO crm_roles (empresa_id, nombre, permisos, is_full_access) VALUES ($1, $2, $3::jsonb, $4) RETURNING *`,
    [empresaId, nom, JSON.stringify(perms), full]
  );
  return r.rows[0];
}

async function actualizar(id, empresaId, { nombre, permisos, is_full_access }) {
  const row = await obtenerPorId(id, empresaId);
  if (!row) return null;
  const updates = [];
  const vals = [];
  let i = 1;
  if (nombre !== undefined) {
    const nom = String(nombre || '').trim();
    if (!nom) throw new Error('El nombre no puede estar vacío');
    updates.push(`nombre = $${i++}`);
    vals.push(nom);
  }
  if (is_full_access !== undefined) {
    updates.push(`is_full_access = $${i++}`);
    vals.push(!!is_full_access);
  }
  if (permisos !== undefined && !row.is_full_access) {
    updates.push(`permisos = $${i++}::jsonb`);
    vals.push(JSON.stringify(normalizePermisos(permisos)));
  }
  if (updates.length === 0) return row;
  vals.push(id, empresaId);
  const r = await query(
    `UPDATE crm_roles SET ${updates.join(', ')}, updated_at = now() WHERE id = $${i++} AND empresa_id = $${i} RETURNING *`,
    vals
  );
  return r.rows[0] || null;
}

async function contarUsuariosConRol(roleId) {
  const r = await query(`SELECT COUNT(*)::int AS n FROM usuarios WHERE crm_role_id = $1`, [roleId]);
  return r.rows[0]?.n || 0;
}

async function eliminar(id, empresaId) {
  const row = await obtenerPorId(id, empresaId);
  if (!row) return { ok: false, error: 'Rol no encontrado' };
  if (row.is_full_access) return { ok: false, error: 'No se puede eliminar el rol de administrador con acceso total' };
  const n = await contarUsuariosConRol(id);
  if (n > 0) return { ok: false, error: 'Hay usuarios asignados a este rol' };
  await query(`DELETE FROM crm_roles WHERE id = $1 AND empresa_id = $2`, [id, empresaId]);
  return { ok: true };
}

module.exports = {
  crearRolAdminInicial,
  listarPorEmpresa,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  contarUsuariosConRol,
};
