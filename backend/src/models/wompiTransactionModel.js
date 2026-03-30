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

module.exports = { createIfNotExists, updateStatusByWompiId };

