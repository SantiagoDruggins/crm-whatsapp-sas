const { query } = require('../config/db');

async function createIfNotExists({
  empresaId,
  subscriptionId,
  planCodigo,
  wompiTransactionId,
  amountCents,
  currency = 'COP',
  status,
  reference,
  rawEvent,
}) {
  const r = await query(
    `INSERT INTO wompi_transactions
      (empresa_id, subscription_id, plan_codigo, wompi_transaction_id, amount_cents, currency, status, reference, raw_event)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
     ON CONFLICT (wompi_transaction_id) DO NOTHING
     RETURNING *`,
    [
      empresaId,
      subscriptionId || null,
      planCodigo || null,
      wompiTransactionId,
      amountCents,
      currency,
      status || null,
      reference || null,
      rawEvent ? JSON.stringify(rawEvent) : null,
    ]
  );
  return r.rows[0] || null;
}

async function updateStatusByWompiId(wompiTransactionId, status) {
  const r = await query(
    `UPDATE wompi_transactions SET status = $2 WHERE wompi_transaction_id = $1 RETURNING *`,
    [wompiTransactionId, status]
  );
  return r.rows[0] || null;
}

async function listByEmpresaId(empresaId, limit = 50) {
  const lim = Math.min(200, Math.max(1, Number(limit) || 50));
  const r = await query(
    `SELECT id, empresa_id, subscription_id, plan_codigo, wompi_transaction_id, amount_cents, currency, status, reference, created_at
     FROM wompi_transactions
     WHERE empresa_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [empresaId, lim]
  );
  return r.rows || [];
}

async function listAllForAdmin(limit = 100, offset = 0) {
  const lim = Math.min(500, Math.max(1, Number(limit) || 100));
  const off = Math.max(0, Number(offset) || 0);
  const r = await query(
    `SELECT t.id, t.empresa_id, t.plan_codigo, t.wompi_transaction_id, t.amount_cents, t.currency, t.status, t.reference, t.created_at,
            e.nombre AS empresa_nombre, e.email AS empresa_email
     FROM wompi_transactions t
     LEFT JOIN empresas e ON e.id = t.empresa_id
     ORDER BY t.created_at DESC
     LIMIT $1 OFFSET $2`,
    [lim, off]
  );
  return r.rows || [];
}

module.exports = { createIfNotExists, updateStatusByWompiId, listByEmpresaId, listAllForAdmin };

