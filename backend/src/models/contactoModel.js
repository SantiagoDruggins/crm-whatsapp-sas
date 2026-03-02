const { query } = require('../config/db');

function normalizarTelefono(t) {
  return (t && String(t).replace(/\D/g, '').trim()) || '';
}

async function countByEmpresa(empresaId) {
  try {
    const r = await query(`SELECT COUNT(*) AS total FROM contactos WHERE empresa_id = $1`, [empresaId]);
    return Number(r.rows[0]?.total || 0);
  } catch (e) {
    return 0;
  }
}

async function listar(empresaId, { limit = 50, offset = 0 } = {}) {
  try {
    const result = await query(
      `SELECT * FROM contactos WHERE empresa_id = $1 ORDER BY updated_at DESC NULLS LAST LIMIT $2 OFFSET $3`,
      [empresaId, limit, offset]
    );
    return result.rows || [];
  } catch (e) {
    console.error('contactoModel.listar:', e.message);
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
  const vals = [empresaId, data.nombre || 'Sin nombre', data.apellidos || null, data.email || null, data.telefono ? normalizarTelefono(data.telefono) : null, data.origen || 'manual', Array.isArray(data.tags) ? data.tags : [], data.notas || null];
  try {
    const leadStatus = (data.lead_status && String(data.lead_status).trim()) || 'new';
    const result = await query(
      `INSERT INTO contactos (empresa_id, nombre, apellidos, email, telefono, origen, tags, notas, lead_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [...vals, leadStatus]
    );
    return result.rows[0];
  } catch (e) {
    const result = await query(
      `INSERT INTO contactos (empresa_id, nombre, apellidos, email, telefono, origen, tags, notas) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      vals
    );
    return result.rows[0];
  }
}

async function actualizar(empresaId, id, data) {
  const updates = ['nombre', 'apellidos', 'email', 'tags', 'notas', 'lead_status', 'conversation_status', 'assigned_to'];
  const setClause = [];
  const values = [id, empresaId];
  let idx = 3;
  for (const key of updates) {
    if (data[key] !== undefined) {
      setClause.push(`${key} = $${idx}`);
      values.push(key === 'tags' && !Array.isArray(data[key]) ? data[key] : data[key]);
      idx++;
    }
  }
  if (setClause.length === 0) {
    const r = await query(`SELECT * FROM contactos WHERE id = $1 AND empresa_id = $2`, [id, empresaId]);
    return r.rows[0] || null;
  }
  setClause.push('updated_at = now()');
  const result = await query(`UPDATE contactos SET ${setClause.join(', ')} WHERE id = $1 AND empresa_id = $2 RETURNING *`, values);
  return result.rows[0] || null;
}

/** Actualiza last_message_at, last_message y last_interaction_at del contacto (tras nuevo mensaje). */
async function actualizarUltimoMensajeContacto(empresaId, contactoId, { lastMessage, lastMessageAt } = {}) {
  const now = lastMessageAt || new Date();
  await query(
    `UPDATE contactos SET last_message_at = $2, last_message = COALESCE($3, last_message), last_interaction_at = $2, updated_at = now() WHERE id = $1 AND empresa_id = $4`,
    [contactoId, now, lastMessage ?? null, empresaId]
  );
}

/** Contexto completo del contacto para el chatbot: contacto, últimos mensajes, tags, lead_status, conversation_state, citas. */
async function getContactContext(empresaId, contactId, { mensajesLimit = 30 } = {}) {
  const contact = await getById(empresaId, contactId);
  if (!contact) return null;

  const conv = await query(`SELECT id FROM conversaciones WHERE empresa_id = $1 AND contacto_id = $2 AND canal = 'whatsapp' LIMIT 1`, [empresaId, contactId]);
  const conversacionId = conv.rows[0]?.id || null;

  let lastMessages = [];
  if (conversacionId) {
    const msg = await query(
      `SELECT id, origen, contenido, es_entrada, created_at FROM mensajes WHERE conversacion_id = $1 AND empresa_id = $2 ORDER BY created_at DESC LIMIT $3`,
      [conversacionId, empresaId, mensajesLimit]
    );
    lastMessages = (msg.rows || []).reverse().map((m) => ({
      role: m.es_entrada ? 'user' : 'assistant',
      content: m.contenido,
      timestamp: m.created_at,
      message_type: 'text',
    }));
  }

  const stateRes = await query(`SELECT current_state, last_intent, context_data, updated_at FROM conversation_state WHERE empresa_id = $1 AND contacto_id = $2 LIMIT 1`, [empresaId, contactId]);
  const conversationState = stateRes.rows[0] ? { current_state: stateRes.rows[0].current_state, last_intent: stateRes.rows[0].last_intent, context_data: stateRes.rows[0].context_data || {}, updated_at: stateRes.rows[0].updated_at } : null;

  const tagsRes = await query(
    `SELECT t.id, t.name, t.color FROM tags t INNER JOIN contact_tags ct ON ct.tag_id = t.id WHERE ct.contact_id = $1 AND t.empresa_id = $2`,
    [contactId, empresaId]
  );
  const tags = tagsRes.rows || [];

  const appRes = await query(`SELECT id, date, time, status, notes FROM appointments WHERE empresa_id = $1 AND contact_id = $2 AND date >= CURRENT_DATE ORDER BY date ASC, time ASC NULLS LAST LIMIT 10`, [empresaId, contactId]);
  const appointments = appRes.rows || [];

  return {
    contact,
    lastMessages,
    tags,
    leadStatus: contact.lead_status || 'new',
    conversationState,
    appointments,
    conversacionId,
  };
}

async function getOrCreateByTelefono(empresaId, telefono) {
  const c = await getByTelefono(empresaId, telefono);
  if (c) return c;
  const t = normalizarTelefono(telefono) || String(telefono);
  return crear(empresaId, { nombre: t || 'Sin nombre', telefono: t, origen: 'whatsapp' });
}

async function eliminar(empresaId, id) {
  const result = await query(`DELETE FROM contactos WHERE id = $1 AND empresa_id = $2 RETURNING id`, [id, empresaId]);
  return result.rowCount > 0;
}

module.exports = { listar, getById, getByTelefono, crear, actualizar, actualizarUltimoMensajeContacto, getContactContext, getOrCreateByTelefono, countByEmpresa, eliminar };
