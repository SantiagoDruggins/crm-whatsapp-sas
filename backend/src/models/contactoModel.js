const { query } = require('../config/db');

function normalizarTelefono(t) {
  return (t && String(t).replace(/\D/g, '').trim()) || '';
}

async function listar(empresaId, { limit = 50, offset = 0 } = {}) {
  try {
    const result = await query(`SELECT * FROM contactos WHERE empresa_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`, [empresaId, limit, offset]);
    return result.rows;
  } catch (e) {
    return [];
  }
}

async function getById(empresaId, id) {
  const result = await query(`SELECT * FROM contactos WHERE id = $1 AND empresa_id = $2`, [id, empresaId]);
  return result.rows[0] || null;
}

async function getByTelefono(empresaId, telefono) {
  const t = normalizarTelefono(telefono);
  if (!t) return null;
  const result = await query(`SELECT * FROM contactos WHERE empresa_id = $1 AND telefono = $2 LIMIT 1`, [empresaId, t]);
  return result.rows[0] || null;
}

async function crear(empresaId, data) {
  const result = await query(`INSERT INTO contactos (empresa_id, nombre, apellidos, email, telefono, origen, tags, notas) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [empresaId, data.nombre || 'Sin nombre', data.apellidos || null, data.email || null, data.telefono ? normalizarTelefono(data.telefono) : null, data.origen || 'manual', Array.isArray(data.tags) ? data.tags : [], data.notas || null]);
  return result.rows[0];
}

async function actualizar(empresaId, id, data) {
  const result = await query(`UPDATE contactos SET nombre = COALESCE($2, nombre), apellidos = COALESCE($3, apellidos), email = COALESCE($4, email), tags = COALESCE($5, tags), notas = COALESCE($6, notas), updated_at = now() WHERE id = $1 AND empresa_id = $7 RETURNING *`, [id, data.nombre, data.apellidos, data.email, data.tags, data.notas, empresaId]);
  return result.rows[0] || null;
}

async function getOrCreateByTelefono(empresaId, telefono) {
  const c = await getByTelefono(empresaId, telefono);
  if (c) return c;
  const t = normalizarTelefono(telefono) || String(telefono);
  return crear(empresaId, { nombre: t || 'Sin nombre', telefono: t, origen: 'whatsapp' });
}

module.exports = { listar, getById, getByTelefono, crear, actualizar, getOrCreateByTelefono };
