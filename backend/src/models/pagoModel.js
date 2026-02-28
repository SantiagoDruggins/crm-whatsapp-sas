const { query } = require('../config/db');

async function crear(empresaId, data) {
  const result = await query(`INSERT INTO pagos (empresa_id, plan, monto, metodo, comprobante_url, estado, referencia) VALUES ($1, $2, $3, 'nequi', $4, 'pendiente', $5) RETURNING *`, [empresaId, data.plan, data.monto, data.comprobanteUrl, data.referencia || null]);
  return result.rows[0];
}

async function listarPorEmpresa(empresaId, { limit = 20, offset = 0 } = {}) {
  const result = await query(`SELECT * FROM pagos WHERE empresa_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [empresaId, limit, offset]);
  return result.rows;
}

async function listarPendientes({ limit = 50, offset = 0 } = {}) {
  const result = await query(`SELECT p.*, e.nombre AS empresa_nombre, e.email AS empresa_email FROM pagos p JOIN empresas e ON e.id = p.empresa_id WHERE p.estado = 'pendiente' ORDER BY p.created_at ASC LIMIT $1 OFFSET $2`, [limit, offset]);
  return result.rows;
}

async function getById(id) {
  const result = await query(`SELECT * FROM pagos WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function aprobar(pagoId, aprobadoPor) {
  const pago = await getById(pagoId);
  if (!pago || pago.estado !== 'pendiente') return null;
  const plan = await require('./planModel').getByCodigo(pago.plan);
  const duracionDias = plan ? (plan.duracion_dias || 30) : 30;
  const fechaFin = new Date(Date.now() + duracionDias * 24 * 60 * 60 * 1000);
  await query(`UPDATE empresas SET estado = 'activa', plan = $2, fecha_expiracion = $3, updated_at = now() WHERE id = $1`, [pago.empresa_id, pago.plan, fechaFin]);
  await query(`UPDATE pagos SET estado = 'aprobado', fecha_pago = now(), aprobado_por = $2, updated_at = now() WHERE id = $1`, [pagoId, aprobadoPor]);
  return await getById(pagoId);
}

async function rechazar(pagoId, aprobadoPor, observaciones) {
  const pago = await getById(pagoId);
  if (!pago || pago.estado !== 'pendiente') return null;
  await query(`UPDATE pagos SET estado = 'rechazado', aprobado_por = $2, observaciones = $3, updated_at = now() WHERE id = $1`, [pagoId, aprobadoPor, observaciones]);
  await query(`UPDATE empresas SET estado = 'vencida', updated_at = now() WHERE id = $1`, [pago.empresa_id]);
  return await getById(pagoId);
}

module.exports = { crear, listarPorEmpresa, listarPendientes, getById, aprobar, rechazar };
