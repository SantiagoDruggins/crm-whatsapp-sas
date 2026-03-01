const { query } = require('../config/db');

async function listarPorEmpresa(empresaId, { limit = 100, offset = 0, desde, hasta } = {}) {
  let sql = `SELECT a.*, c.nombre AS contacto_nombre, c.apellidos AS contacto_apellidos, c.telefono AS contacto_telefono
             FROM appointments a
             JOIN contactos c ON c.id = a.contact_id AND c.empresa_id = a.empresa_id
             WHERE a.empresa_id = $1`;
  const values = [empresaId];
  let idx = 2;
  if (desde) {
    sql += ` AND a.date >= $${idx}`;
    values.push(desde);
    idx++;
  }
  if (hasta) {
    sql += ` AND a.date <= $${idx}`;
    values.push(hasta);
    idx++;
  }
  sql += ` ORDER BY a.date ASC, a.time ASC NULLS LAST LIMIT $${idx} OFFSET $${idx + 1}`;
  values.push(limit, offset);
  const result = await query(sql, values);
  return result.rows;
}

async function listarPorContacto(empresaId, contactId, { desde } = {}) {
  let sql = `SELECT * FROM appointments WHERE empresa_id = $1 AND contact_id = $2`;
  const values = [empresaId, contactId];
  if (desde) {
    sql += ` AND date >= $3`;
    values.push(desde);
  }
  sql += ` ORDER BY date ASC, time ASC NULLS LAST`;
  const result = await query(sql, values);
  return result.rows;
}

async function getById(empresaId, id) {
  const result = await query(`SELECT * FROM appointments WHERE id = $1 AND empresa_id = $2`, [id, empresaId]);
  return result.rows[0] || null;
}

async function crear(empresaId, { contact_id, date, time, status, notes } = {}) {
  const result = await query(
    `INSERT INTO appointments (empresa_id, contact_id, date, time, status, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [empresaId, contact_id, date, time || null, status || 'programada', notes || null]
  );
  return result.rows[0];
}

async function actualizar(empresaId, id, { date, time, status, notes } = {}) {
  const updates = [];
  const values = [id, empresaId];
  let idx = 3;
  if (date !== undefined) {
    updates.push(`date = $${idx}`);
    values.push(date);
    idx++;
  }
  if (time !== undefined) {
    updates.push(`time = $${idx}`);
    values.push(time);
    idx++;
  }
  if (status !== undefined) {
    updates.push(`status = $${idx}`);
    values.push(status);
    idx++;
  }
  if (notes !== undefined) {
    updates.push(`notes = $${idx}`);
    values.push(notes);
    idx++;
  }
  if (updates.length === 0) {
    return getById(empresaId, id);
  }
  updates.push('updated_at = now()');
  const result = await query(`UPDATE appointments SET ${updates.join(', ')} WHERE id = $1 AND empresa_id = $2 RETURNING *`, values);
  return result.rows[0] || null;
}

async function eliminar(empresaId, id) {
  const result = await query(`DELETE FROM appointments WHERE id = $1 AND empresa_id = $2 RETURNING id`, [id, empresaId]);
  return result.rowCount > 0;
}

/** Indica si ya existe alguna cita para la empresa en esa fecha y hora (evitar doble reserva). */
function normalizarHora(t) {
  if (!t) return '';
  const s = String(t).trim();
  return s.length >= 5 ? s.substring(0, 5) : s;
}

async function existeCitaEnHorario(empresaId, date, time) {
  if (!date) return false;
  const hora = normalizarHora(time);
  if (!hora || hora.length < 5) return false;
  const list = await listarPorEmpresa(empresaId, { desde: date, hasta: date, limit: 200 });
  return list.some((a) => normalizarHora(a.time) === hora);
}

module.exports = { listarPorEmpresa, listarPorContacto, getById, crear, actualizar, eliminar, existeCitaEnHorario };
