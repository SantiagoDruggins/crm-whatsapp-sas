const { query } = require('../config/db');

async function crearEmpresaConDemo({ nombre, email, passwordHash }) {
  const demoExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const result = await query(`
    INSERT INTO empresas (nombre, email, password_hash, estado, demo_expires_at, plan)
    VALUES ($1, $2, $3, 'demo_activa', $4, 'demo')
    RETURNING *
  `, [nombre, email, passwordHash, demoExpiresAt]);
  return result.rows[0];
}

async function obtenerEmpresaPorEmail(email) {
  const result = await query(`SELECT * FROM empresas WHERE LOWER(email) = LOWER($1)`, [email]);
  return result.rows[0] || null;
}

async function actualizarEstadoEmpresa(id, { estado, fechaExpiracion, plan }) {
  const result = await query(`
    UPDATE empresas SET estado = COALESCE($2, estado), fecha_expiracion = COALESCE($3, fecha_expiracion), plan = COALESCE($4, plan), updated_at = now()
    WHERE id = $1 RETURNING *
  `, [id, estado || null, fechaExpiracion || null, plan || null]);
  return result.rows[0] || null;
}

async function obtenerEmpresaPorId(id) {
  const result = await query(`SELECT * FROM empresas WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function listarEmpresas({ limit = 50, offset = 0 }) {
  const result = await query(`SELECT * FROM empresas ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
  return result.rows;
}

async function getWhatsappConfig(empresaId) {
  const result = await query(
    `SELECT whatsapp_cloud_access_token, whatsapp_cloud_phone_number_id FROM empresas WHERE id = $1`,
    [empresaId]
  );
  return result.rows[0] || null;
}

async function updateWhatsappConfig(empresaId, { accessToken, phoneNumberId }) {
  const updates = [];
  const values = [empresaId];
  let i = 2;
  if (accessToken !== undefined) {
    updates.push(`whatsapp_cloud_access_token = $${i}`);
    values.push(accessToken === '' ? null : accessToken);
    i++;
  }
  if (phoneNumberId !== undefined) {
    updates.push(`whatsapp_cloud_phone_number_id = $${i}`);
    values.push(phoneNumberId === '' ? null : phoneNumberId);
    i++;
  }
  if (updates.length === 0) return await getWhatsappConfig(empresaId);
  await query(
    `UPDATE empresas SET ${updates.join(', ')}, updated_at = now() WHERE id = $1`,
    values
  );
  return await getWhatsappConfig(empresaId);
}

async function getEmpresaByWhatsappPhoneNumberId(phoneNumberId) {
  const result = await query(
    `SELECT id, nombre FROM empresas WHERE whatsapp_cloud_phone_number_id = $1 AND whatsapp_cloud_access_token IS NOT NULL LIMIT 1`,
    [phoneNumberId]
  );
  return result.rows[0] || null;
}

async function getIntegracionesConfig(empresaId) {
  const result = await query(
    `SELECT dropi_token, dropi_activo, mastershop_token, mastershop_activo, gemini_api_key, ai_provider, ai_api_key FROM empresas WHERE id = $1`,
    [empresaId]
  );
  const row = result.rows[0];
  if (!row) return null;
  const hasCustomKey = !!(row.ai_api_key && row.ai_api_key.trim()) || !!(row.gemini_api_key && row.gemini_api_key.trim());
  return {
    dropi_token: row.dropi_token || '',
    dropi_activo: !!row.dropi_activo,
    mastershop_token: row.mastershop_token || '',
    mastershop_activo: !!row.mastershop_activo,
    gemini_api_key: row.gemini_api_key ? '********' : '',
    gemini_configurado: !!(row.gemini_api_key && row.gemini_api_key.trim()),
    ai_provider: (row.ai_provider && row.ai_provider.trim()) || 'gemini',
    ai_api_key: (row.ai_api_key && row.ai_api_key.trim()) ? '********' : '',
    ai_configurado: hasCustomKey,
  };
}

async function updateIntegracionesConfig(empresaId, { dropi_token, dropi_activo, mastershop_token, mastershop_activo, gemini_api_key, ai_provider, ai_api_key }) {
  const updates = [];
  const values = [empresaId];
  let i = 2;
  if (dropi_token !== undefined) {
    updates.push(`dropi_token = $${i}`);
    values.push(dropi_token === '' ? null : dropi_token);
    i++;
  }
  if (dropi_activo !== undefined) {
    updates.push(`dropi_activo = $${i}`);
    values.push(!!dropi_activo);
    i++;
  }
  if (mastershop_token !== undefined) {
    updates.push(`mastershop_token = $${i}`);
    values.push(mastershop_token === '' ? null : mastershop_token);
    i++;
  }
  if (mastershop_activo !== undefined) {
    updates.push(`mastershop_activo = $${i}`);
    values.push(!!mastershop_activo);
    i++;
  }
  if (gemini_api_key !== undefined) {
    const val = typeof gemini_api_key === 'string' ? gemini_api_key.trim() : '';
    updates.push(`gemini_api_key = $${i}`);
    values.push(val === '' || val === '********' ? null : val);
    i++;
  }
  if (ai_provider !== undefined) {
    const p = String(ai_provider || 'gemini').trim().toLowerCase();
    const valid = ['gemini', 'openai', 'anthropic'].includes(p) ? p : 'gemini';
    updates.push(`ai_provider = $${i}`);
    values.push(valid);
    i++;
  }
  if (ai_api_key !== undefined) {
    const val = typeof ai_api_key === 'string' ? ai_api_key.trim() : '';
    updates.push(`ai_api_key = $${i}`);
    values.push(val === '' || val === '********' ? null : val);
    i++;
  }
  if (updates.length === 0) return await getIntegracionesConfig(empresaId);
  await query(`UPDATE empresas SET ${updates.join(', ')}, updated_at = now() WHERE id = $1`, values);
  return await getIntegracionesConfig(empresaId);
}

module.exports = { crearEmpresaConDemo, obtenerEmpresaPorEmail, actualizarEstadoEmpresa, obtenerEmpresaPorId, listarEmpresas, getWhatsappConfig, updateWhatsappConfig, getEmpresaByWhatsappPhoneNumberId, getIntegracionesConfig, updateIntegracionesConfig };
