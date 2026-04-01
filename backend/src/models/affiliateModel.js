const { pool, query } = require('../config/db');
const config = require('../config/env');

function normalizeCode(v) {
  return String(v || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 40);
}

function randomCode(seed = '') {
  const base = String(seed || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${base || 'CRM'}-${rnd}`;
}

async function getCodeByEmpresaId(empresaId) {
  const r = await query(`SELECT * FROM affiliate_codes WHERE empresa_id = $1 LIMIT 1`, [empresaId]);
  return r.rows[0] || null;
}

async function getByCode(codeRaw) {
  const code = normalizeCode(codeRaw);
  if (!code) return null;
  const r = await query(`SELECT * FROM affiliate_codes WHERE code = $1 AND activo = true LIMIT 1`, [code]);
  return r.rows[0] || null;
}

async function getOrCreateCodeForEmpresa(empresaId, empresaNombre = '') {
  const existing = await getCodeByEmpresaId(empresaId);
  if (existing) return existing;
  for (let i = 0; i < 6; i += 1) {
    const candidate = randomCode(empresaNombre);
    try {
      const r = await query(
        `INSERT INTO affiliate_codes (empresa_id, code, activo) VALUES ($1, $2, true) RETURNING *`,
        [empresaId, candidate]
      );
      return r.rows[0] || null;
    } catch (e) {
      if (!String(e.message || '').toLowerCase().includes('duplicate')) throw e;
    }
  }
  throw new Error('No se pudo generar código de afiliado único');
}

async function upsertCodeByEmpresa({ empresaId, codeRaw, activo = true }) {
  const code = normalizeCode(codeRaw);
  if (!code || code.length < 4) {
    return { ok: false, reason: 'invalid_code' };
  }
  try {
    const r = await query(
      `INSERT INTO affiliate_codes (empresa_id, code, activo)
       VALUES ($1, $2, $3)
       ON CONFLICT (empresa_id)
       DO UPDATE SET code = EXCLUDED.code, activo = EXCLUDED.activo, updated_at = now()
       RETURNING *`,
      [empresaId, code, !!activo]
    );
    return { ok: true, row: r.rows[0] || null };
  } catch (e) {
    if (String(e.message || '').toLowerCase().includes('duplicate')) {
      return { ok: false, reason: 'code_in_use' };
    }
    throw e;
  }
}

async function createReferralFromCode({ codeRaw, empresaReferidaId }) {
  const code = await getByCode(codeRaw);
  if (!code) return { ok: false, reason: 'invalid_code' };
  if (String(code.empresa_id) === String(empresaReferidaId)) return { ok: false, reason: 'self_referral' };
  const r = await query(
    `INSERT INTO affiliate_referrals (codigo_id, empresa_referida_id, estado)
     VALUES ($1, $2, 'registrado')
     ON CONFLICT (empresa_referida_id) DO NOTHING
     RETURNING *`,
    [code.id, empresaReferidaId]
  );
  return { ok: !!r.rows[0], reason: r.rows[0] ? 'created' : 'already_exists', referral: r.rows[0] || null };
}

async function listMyReferrals(empresaId, { limit = 50 } = {}) {
  const lim = Math.min(200, Math.max(1, Number(limit) || 50));
  const code = await getCodeByEmpresaId(empresaId);
  if (!code) return { code: null, referrals: [] };
  const r = await query(
    `SELECT ar.id, ar.estado, ar.reward_days, ar.rewarded_at, ar.created_at,
            e.id AS empresa_referida_id, e.nombre AS empresa_referida_nombre, e.email AS empresa_referida_email
     FROM affiliate_referrals ar
     JOIN affiliate_codes ac ON ac.id = ar.codigo_id
     LEFT JOIN empresas e ON e.id = ar.empresa_referida_id
     WHERE ac.empresa_id = $1
     ORDER BY ar.created_at DESC
     LIMIT $2`,
    [empresaId, lim]
  );
  return { code, referrals: r.rows || [] };
}

async function applyRewardForPaidReferral(empresaReferidaId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rr = await client.query(
      `SELECT ar.id, ar.estado, ar.rewarded_at, ac.empresa_id AS empresa_creadora_id
       FROM affiliate_referrals ar
       JOIN affiliate_codes ac ON ac.id = ar.codigo_id
       WHERE ar.empresa_referida_id = $1
       LIMIT 1`,
      [empresaReferidaId]
    );
    const row = rr.rows[0];
    if (!row) {
      await client.query('COMMIT');
      return { rewarded: false, reason: 'no_referral' };
    }
    if (row.rewarded_at || row.estado === 'recompensado') {
      await client.query('COMMIT');
      return { rewarded: false, reason: 'already_rewarded' };
    }
    if (String(row.empresa_creadora_id) === String(empresaReferidaId)) {
      await client.query('COMMIT');
      return { rewarded: false, reason: 'self_referral' };
    }
    const rewardDays = Math.max(1, Number(config.affiliates?.rewardDaysReferrer || 15));
    const empR = await client.query(`SELECT fecha_expiracion FROM empresas WHERE id = $1 LIMIT 1`, [row.empresa_creadora_id]);
    if (!empR.rows[0]) {
      await client.query('ROLLBACK');
      return { rewarded: false, reason: 'creator_not_found' };
    }
    const current = empR.rows[0].fecha_expiracion ? new Date(empR.rows[0].fecha_expiracion) : null;
    const base = current && current > new Date() ? current : new Date();
    const nuevaExp = new Date(base.getTime() + rewardDays * 24 * 60 * 60 * 1000);
    await client.query(`UPDATE empresas SET fecha_expiracion = $2, updated_at = now() WHERE id = $1`, [
      row.empresa_creadora_id,
      nuevaExp,
    ]);
    await client.query(
      `UPDATE affiliate_referrals
       SET estado = 'recompensado', reward_days = $2, rewarded_at = now(), updated_at = now()
       WHERE id = $1`,
      [row.id, rewardDays]
    );
    await client.query('COMMIT');
    return { rewarded: true, rewardDays, empresaCreadoraId: row.empresa_creadora_id };
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  normalizeCode,
  getCodeByEmpresaId,
  getOrCreateCodeForEmpresa,
  upsertCodeByEmpresa,
  getByCode,
  createReferralFromCode,
  listMyReferrals,
  applyRewardForPaidReferral,
};
