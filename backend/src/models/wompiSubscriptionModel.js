const { query } = require('../config/db');

async function getByEmpresaId(empresaId) {
  const r = await query(`SELECT * FROM wompi_subscriptions WHERE empresa_id = $1 LIMIT 1`, [empresaId]);
  return r.rows[0] || null;
}

async function upsertForEmpresa(empresaId, data) {
  const {
    plan_codigo,
    status,
    wompi_payment_source_id,
    customer_email,
    next_charge_at,
    last_transaction_id,
    last_transaction_status,
    last_error,
  } = data || {};

  const r = await query(
    `INSERT INTO wompi_subscriptions
      (empresa_id, plan_codigo, status, wompi_payment_source_id, customer_email, next_charge_at, last_transaction_id, last_transaction_status, last_error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (empresa_id) DO UPDATE SET
      plan_codigo = EXCLUDED.plan_codigo,
      status = EXCLUDED.status,
      wompi_payment_source_id = COALESCE(EXCLUDED.wompi_payment_source_id, wompi_subscriptions.wompi_payment_source_id),
      customer_email = COALESCE(EXCLUDED.customer_email, wompi_subscriptions.customer_email),
      next_charge_at = COALESCE(EXCLUDED.next_charge_at, wompi_subscriptions.next_charge_at),
      last_transaction_id = COALESCE(EXCLUDED.last_transaction_id, wompi_subscriptions.last_transaction_id),
      last_transaction_status = COALESCE(EXCLUDED.last_transaction_status, wompi_subscriptions.last_transaction_status),
      last_error = EXCLUDED.last_error,
      updated_at = now()
     RETURNING *`,
    [
      empresaId,
      plan_codigo,
      status || 'active',
      wompi_payment_source_id ?? null,
      customer_email ?? null,
      next_charge_at ?? null,
      last_transaction_id ?? null,
      last_transaction_status ?? null,
      last_error ?? null,
    ]
  );
  return r.rows[0] || null;
}

async function updateById(id, patch) {
  const fields = [];
  const values = [id];
  let i = 2;
  for (const [k, v] of Object.entries(patch || {})) {
    fields.push(`${k} = $${i}`);
    values.push(v);
    i++;
  }
  if (!fields.length) return null;
  const r = await query(`UPDATE wompi_subscriptions SET ${fields.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`, values);
  return r.rows[0] || null;
}

module.exports = { getByEmpresaId, upsertForEmpresa, updateById };

