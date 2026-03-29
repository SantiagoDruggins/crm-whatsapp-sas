const { query } = require('../config/db');

let supportFlagsColumnsCache = null;

async function hasSupportFlagsColumns() {
  if (supportFlagsColumnsCache !== null) return supportFlagsColumnsCache;
  try {
    const r = await query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_name = 'conversaciones'
           AND column_name = 'pide_agente_humano'
       ) AS ok`
    );
    supportFlagsColumnsCache = !!r.rows[0]?.ok;
    return supportFlagsColumnsCache;
  } catch {
    supportFlagsColumnsCache = false;
    return false;
  }
}

async function listar(empresaId, { limit = 50, offset = 0, pideAgente = false } = {}) {
  const hasFlags = await hasSupportFlagsColumns();
  let sql = `SELECT conv.*, c.nombre AS contacto_nombre, c.apellidos AS contacto_apellidos, c.telefono AS contacto_telefono,
            c.avatar_url AS contacto_avatar_url, c.lead_status AS contacto_lead_status, c.last_message AS contacto_last_message
     FROM conversaciones conv
     LEFT JOIN contactos c ON c.id = conv.contacto_id AND c.empresa_id = conv.empresa_id
     WHERE conv.empresa_id = $1`;
  const vals = [empresaId];
  if (pideAgente && hasFlags) {
    sql += ` AND conv.pide_agente_humano = true`;
  }
  sql += hasFlags
    ? ` ORDER BY conv.pide_agente_humano_at DESC NULLS LAST, conv.ultimo_mensaje_at DESC NULLS LAST LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`
    : ` ORDER BY conv.ultimo_mensaje_at DESC NULLS LAST LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`;
  vals.push(limit, offset);
  try {
    const result = await query(sql, vals);
    return result.rows;
  } catch (e) {
    // Fallback para BDs antiguas sin columnas pide_agente_* (evita lista vacía en producción).
    try {
      let legacySql = `SELECT conv.*, c.nombre AS contacto_nombre, c.apellidos AS contacto_apellidos, c.telefono AS contacto_telefono,
            c.avatar_url AS contacto_avatar_url, c.lead_status AS contacto_lead_status, c.last_message AS contacto_last_message
         FROM conversaciones conv
         LEFT JOIN contactos c ON c.id = conv.contacto_id AND c.empresa_id = conv.empresa_id
         WHERE conv.empresa_id = $1`;
      const legacyVals = [empresaId];
      legacySql += ` ORDER BY conv.ultimo_mensaje_at DESC NULLS LAST LIMIT $2 OFFSET $3`;
      legacyVals.push(limit, offset);
      const legacy = await query(legacySql, legacyVals);
      return legacy.rows;
    } catch {
      return [];
    }
  }
}

async function getById(empresaId, id) {
  const result = await query(
    `SELECT conv.*, c.nombre AS contacto_nombre, c.apellidos AS contacto_apellidos, c.telefono AS contacto_telefono,
            c.avatar_url AS contacto_avatar_url, c.lead_status AS contacto_lead_status, c.last_message AS contacto_last_message
     FROM conversaciones conv
     LEFT JOIN contactos c ON c.id = conv.contacto_id AND c.empresa_id = conv.empresa_id
     WHERE conv.id = $1 AND conv.empresa_id = $2`,
    [id, empresaId]
  );
  return result.rows[0] || null;
}

async function actualizar(empresaId, id, data) {
  const result = await query(`UPDATE conversaciones SET estado = COALESCE($2, estado), asignado_a = COALESCE($3, asignado_a), updated_at = now() WHERE id = $1 AND empresa_id = $4 RETURNING *`, [id, data.estado, data.asignado_a, empresaId]);
  return result.rows[0] || null;
}

async function actualizarUltimoMensaje(id) {
  await query(`UPDATE conversaciones SET ultimo_mensaje_at = now() WHERE id = $1`, [id]);
}

async function marcarPideAgente(conversacionId) {
  try {
    if (!(await hasSupportFlagsColumns())) return;
    await query(`UPDATE conversaciones SET pide_agente_humano = true, pide_agente_humano_at = COALESCE(pide_agente_humano_at, now()), updated_at = now() WHERE id = $1`, [conversacionId]);
  } catch (e) {
    // Columna puede no existir si no se corrió la migración
  }
}

async function desmarcarPideAgente(conversacionId) {
  try {
    if (!(await hasSupportFlagsColumns())) return;
    await query(`UPDATE conversaciones SET pide_agente_humano = false, pide_agente_humano_at = NULL, updated_at = now() WHERE id = $1`, [conversacionId]);
  } catch (e) {}
}

async function countPideAgente(empresaId) {
  try {
    if (!(await hasSupportFlagsColumns())) return 0;
    const r = await query(`SELECT COUNT(*) AS total FROM conversaciones WHERE empresa_id = $1 AND pide_agente_humano = true`, [empresaId]);
    return parseInt(r.rows[0]?.total || 0, 10);
  } catch (e) {
    return 0;
  }
}

module.exports = { listar, getById, actualizar, actualizarUltimoMensaje, marcarPideAgente, desmarcarPideAgente, countPideAgente, getOrCreate: async (e, c, canal, opts) => { const r = await query(`SELECT * FROM conversaciones WHERE empresa_id = $1 AND contacto_id = $2 AND canal = $3 LIMIT 1`, [e, c, canal || 'whatsapp']); if (r.rows[0]) return r.rows[0]; const ins = await query(`INSERT INTO conversaciones (empresa_id, contacto_id, canal, estado) VALUES ($1, $2, $3, 'abierta') RETURNING *`, [e, c, canal || 'whatsapp']); return ins.rows[0]; } };
