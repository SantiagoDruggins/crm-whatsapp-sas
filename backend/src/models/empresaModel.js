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

/** Super admin: sin password_hash */
async function obtenerEmpresaPublicaPorId(id) {
  const result = await query(
    `SELECT id, nombre, email, estado, plan, demo_expires_at, fecha_expiracion, logo_url,
            COALESCE(marca_blanca, false) AS marca_blanca, marca_blanca_pagado_at,
            COALESCE(es_creador_affiliate, false) AS es_creador_affiliate,
            marca_blanca_dominio, marca_blanca_nombre_publico, admin_notas_internas,
            whatsapp_cloud_phone_number_id, whatsapp_waba_id,
            shopify_activo, shopify_store_url,
            created_at, updated_at,
            (whatsapp_cloud_access_token IS NOT NULL AND TRIM(COALESCE(whatsapp_cloud_access_token, '')) != '') AS whatsapp_token_configurado
     FROM empresas WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function actualizarAdminNotasInternas(empresaId, texto) {
  const v = texto === null || texto === undefined ? null : String(texto);
  const result = await query(
    `UPDATE empresas SET admin_notas_internas = $2, updated_at = now() WHERE id = $1 RETURNING id, admin_notas_internas`,
    [empresaId, v]
  );
  return result.rows[0] || null;
}

async function listarEmpresas({ limit = 50, offset = 0 }) {
  const result = await query(`SELECT * FROM empresas ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
  return result.rows;
}

async function getWhatsappConfig(empresaId) {
  const result = await query(
    `SELECT whatsapp_cloud_access_token, whatsapp_cloud_phone_number_id, whatsapp_waba_id FROM empresas WHERE id = $1`,
    [empresaId]
  );
  return result.rows[0] || null;
}

async function updateWhatsappConfig(empresaId, { accessToken, phoneNumberId, wabaId }) {
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
  if (wabaId !== undefined) {
    updates.push(`whatsapp_waba_id = $${i}`);
    values.push(wabaId === '' ? null : wabaId);
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
  const id =
    phoneNumberId === undefined || phoneNumberId === null
      ? ''
      : String(phoneNumberId).replace(/\s+/g, '').trim();
  if (!id) return null;
  const result = await query(
    `SELECT id, nombre FROM empresas
     WHERE TRIM(COALESCE(whatsapp_cloud_phone_number_id::text, '')) = $1
       AND whatsapp_cloud_access_token IS NOT NULL
     LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Meta envía entry.id = WABA en cada webhook. Si hay varios números en la misma cuenta, el phone_number_id
 * guardado puede no coincidir; este lookup evita "Sin empresa" cuando el WABA sí está guardado.
 */
async function getEmpresaByWhatsappWabaId(wabaId) {
  const id =
    wabaId === undefined || wabaId === null ? '' : String(wabaId).replace(/\s+/g, '').trim();
  if (!id) return null;
  const result = await query(
    `SELECT id, nombre FROM empresas
     WHERE TRIM(COALESCE(whatsapp_waba_id::text, '')) = $1
       AND whatsapp_cloud_access_token IS NOT NULL
     LIMIT 2`,
    [id]
  );
  if (result.rows.length === 1) return result.rows[0];
  if (result.rows.length > 1) {
    console.warn(
      '[empresaModel] Más de una empresa con el mismo whatsapp_waba_id; no se resuelve el webhook sin phone_number_id único.'
    );
  }
  return null;
}

/**
 * Resuelve empresa por el número de teléfono de negocio (empresas.telefono_whatsapp) cuando
 * el phone_number_id de Meta no coincide con la BD. Solo si hay exactamente un match (multitenant).
 */
async function getEmpresaByWhatsappDisplayDigits(displayPhone) {
  const d = String(displayPhone || '').replace(/\D/g, '');
  if (d.length < 8) return null;
  const result = await query(
    `SELECT id, nombre FROM empresas
     WHERE whatsapp_cloud_access_token IS NOT NULL
       AND regexp_replace(COALESCE(telefono_whatsapp, ''), '[^0-9]', '', 'g') = $1
     LIMIT 2`,
    [d]
  );
  if (result.rows.length === 1) return result.rows[0];
  if (result.rows.length === 0 && d.length >= 10) {
    const last10 = d.slice(-10);
    const r2 = await query(
      `SELECT id, nombre FROM empresas
       WHERE whatsapp_cloud_access_token IS NOT NULL
         AND LENGTH(regexp_replace(COALESCE(telefono_whatsapp, ''), '[^0-9]', '', 'g')) >= 10
         AND RIGHT(regexp_replace(COALESCE(telefono_whatsapp, ''), '[^0-9]', '', 'g'), 10) = $1
       LIMIT 2`,
      [last10]
    );
    if (r2.rows.length === 1) return r2.rows[0];
  }
  return null;
}

async function getIntegracionesConfig(empresaId) {
  const result = await query(
    `SELECT gemini_api_key, ai_provider, ai_api_key, shopify_store_url, shopify_access_token, shopify_activo, shopify_webhook_secret FROM empresas WHERE id = $1`,
    [empresaId]
  );
  const row = result.rows[0];
  if (!row) return null;
  const hasCustomKey = !!(row.ai_api_key && row.ai_api_key.trim()) || !!(row.gemini_api_key && row.gemini_api_key.trim());
  return {
    shopify_store_url: (row.shopify_store_url || '').trim() || '',
    shopify_access_token: row.shopify_access_token ? '********' : '',
    shopify_activo: !!row.shopify_activo,
    shopify_webhook_secret: row.shopify_webhook_secret ? '********' : '',
    gemini_api_key: row.gemini_api_key ? '********' : '',
    gemini_configurado: !!(row.gemini_api_key && row.gemini_api_key.trim()),
    ai_provider: (row.ai_provider && row.ai_provider.trim()) || 'gemini',
    ai_api_key: (row.ai_api_key && row.ai_api_key.trim()) ? '********' : '',
    ai_configurado: hasCustomKey,
  };
}

async function updateIntegracionesConfig(empresaId, { gemini_api_key, ai_provider, ai_api_key, shopify_store_url, shopify_access_token, shopify_activo, shopify_webhook_secret }) {
  const updates = [];
  const values = [empresaId];
  let i = 2;
  if (shopify_store_url !== undefined) {
    const val = typeof shopify_store_url === 'string' ? shopify_store_url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
    updates.push(`shopify_store_url = $${i}`);
    values.push(val === '' ? null : val);
    i++;
  }
  if (shopify_access_token !== undefined) {
    const val = typeof shopify_access_token === 'string' ? shopify_access_token.trim() : '';
    if (val !== '' && val !== '********') {
      updates.push(`shopify_access_token = $${i}`);
      values.push(val);
      i++;
    }
  }
  if (shopify_activo !== undefined) {
    updates.push(`shopify_activo = $${i}`);
    values.push(!!shopify_activo);
    i++;
  }
  if (shopify_webhook_secret !== undefined) {
    const val = typeof shopify_webhook_secret === 'string' ? shopify_webhook_secret.trim() : '';
    if (val !== '' && val !== '********') {
      updates.push(`shopify_webhook_secret = $${i}`);
      values.push(val);
      i++;
    }
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

async function getEmpresaByShopifyShopDomain(shopDomain) {
  if (!shopDomain || typeof shopDomain !== 'string') return null;
  const normalized = shopDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
  if (!normalized) return null;
  const result = await query(
    `SELECT id, shopify_webhook_secret FROM empresas WHERE LOWER(TRIM(shopify_store_url)) = $1 AND shopify_activo = true LIMIT 1`,
    [normalized]
  );
  return result.rows[0] || null;
}

async function actualizarBranding(empresaId, { logoUrl }) {
  const result = await query(
    `UPDATE empresas
       SET logo_url = $2,
           updated_at = now()
     WHERE id = $1
     RETURNING id, nombre, logo_url`,
    [empresaId, logoUrl || null]
  );
  return result.rows[0] || null;
}

/**
 * Super admin: activar/editar marca blanca, dominio deseado, nombre público, logo (URL).
 */
async function actualizarMarcaBlancaPorAdmin(empresaId, patch = {}) {
  const fields = [];
  const values = [empresaId];
  let i = 2;
  if (patch.marca_blanca !== undefined) {
    fields.push(`marca_blanca = $${i}`);
    values.push(!!patch.marca_blanca);
    i += 1;
  }
  if (patch.marca_blanca_dominio !== undefined) {
    fields.push(`marca_blanca_dominio = $${i}`);
    values.push(patch.marca_blanca_dominio);
    i += 1;
  }
  if (patch.marca_blanca_nombre_publico !== undefined) {
    fields.push(`marca_blanca_nombre_publico = $${i}`);
    const v = patch.marca_blanca_nombre_publico;
    values.push(v === null || v === '' ? null : String(v).trim().slice(0, 255));
    i += 1;
  }
  if (patch.logo_url !== undefined) {
    fields.push(`logo_url = $${i}`);
    values.push(patch.logo_url || null);
    i += 1;
  }
  if (!fields.length) return obtenerEmpresaPorId(empresaId);
  fields.push('updated_at = now()');
  await query(`UPDATE empresas SET ${fields.join(', ')} WHERE id = $1`, values);
  return obtenerEmpresaPorId(empresaId);
}

async function getAiModels(empresaId) {
  const result = await query(
    `SELECT ai_model_router, ai_model_support, ai_model_pedidos, ai_model_agenda, ai_model_transcribe, ai_model_tts
     FROM empresas WHERE id = $1`,
    [empresaId]
  );
  return result.rows[0] || null;
}

async function updateAiModels(empresaId, models = {}) {
  const allowed = ['ai_model_router', 'ai_model_support', 'ai_model_pedidos', 'ai_model_agenda', 'ai_model_transcribe', 'ai_model_tts'];
  const updates = [];
  const values = [empresaId];
  let i = 2;
  for (const k of allowed) {
    if (models[k] !== undefined) {
      const v = (models[k] == null) ? null : String(models[k]).trim();
      updates.push(`${k} = $${i}`);
      values.push(v === '' ? null : v);
      i++;
    }
  }
  if (!updates.length) return await getAiModels(empresaId);
  await query(`UPDATE empresas SET ${updates.join(', ')}, updated_at = now() WHERE id = $1`, values);
  return await getAiModels(empresaId);
}

module.exports = {
  crearEmpresaConDemo,
  obtenerEmpresaPorEmail,
  actualizarEstadoEmpresa,
  obtenerEmpresaPorId,
  obtenerEmpresaPublicaPorId,
  actualizarAdminNotasInternas,
  listarEmpresas,
  getWhatsappConfig,
  updateWhatsappConfig,
  getEmpresaByWhatsappPhoneNumberId,
  getEmpresaByWhatsappWabaId,
  getEmpresaByWhatsappDisplayDigits,
  getIntegracionesConfig,
  updateIntegracionesConfig,
  getEmpresaByShopifyShopDomain,
  actualizarBranding,
  actualizarMarcaBlancaPorAdmin,
  getAiModels,
  updateAiModels,
};
