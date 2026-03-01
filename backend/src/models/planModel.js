const { query } = require('../config/db');

async function listarActivos() {
  try {
    const result = await query(`SELECT * FROM planes WHERE activo = true ORDER BY precio_mensual ASC NULLS LAST`);
    return result.rows;
  } catch (e) {
    return [];
  }
}

async function getByCodigo(codigo) {
  const result = await query(`SELECT * FROM planes WHERE codigo = $1 AND activo = true LIMIT 1`, [codigo]);
  return result.rows[0] || null;
}

/** Devuelve { max_contactos, max_usuarios } para la empresa. null = ilimitado. Demo usa plan 'demo'. */
async function getLimitsForEmpresa(empresaId) {
  try {
    const emp = await query(`SELECT estado, plan FROM empresas WHERE id = $1`, [empresaId]);
    const row = emp.rows[0];
    if (!row) return { max_contactos: null, max_usuarios: null };
    const codigo = row.estado === 'demo_activa' ? 'demo' : (row.plan || 'BASICO_MENSUAL');
    const plan = await getByCodigo(codigo);
    if (!plan) return { max_contactos: null, max_usuarios: null };
    return {
      max_contactos: plan.max_contactos != null ? Number(plan.max_contactos) : null,
      max_usuarios: plan.max_usuarios != null ? Number(plan.max_usuarios) : null
    };
  } catch (e) {
    return { max_contactos: null, max_usuarios: null };
  }
}

module.exports = { listarActivos, getByCodigo, getLimitsForEmpresa };
