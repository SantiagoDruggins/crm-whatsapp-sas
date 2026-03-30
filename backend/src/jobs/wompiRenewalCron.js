const cron = require('node-cron');
const { query } = require('../config/db');
const planModel = require('../models/planModel');
const subModel = require('../models/wompiSubscriptionModel');
const txModel = require('../models/wompiTransactionModel');
const { getAcceptanceTokens, createTransaction } = require('../services/wompiService');

function toCentsCop(precioMensual) {
  const n = Number(precioMensual || 0);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

async function cobrarSuscripcionesVencidas() {
  try {
    const r = await query(
      `SELECT id, empresa_id, plan_codigo, wompi_payment_source_id, customer_email, next_charge_at, last_transaction_status, updated_at
       FROM wompi_subscriptions
       WHERE status = 'active'
         AND next_charge_at IS NOT NULL
         AND next_charge_at <= now()
       ORDER BY next_charge_at ASC
       LIMIT 50`
    );
    const subs = r.rows || [];
    if (!subs.length) return;

    const { acceptance_token } = await getAcceptanceTokens();

    for (const s of subs) {
      // Evita cobrar de nuevo si una transacción sigue pendiente y se actualizó recientemente.
      const updatedAt = s.updated_at ? new Date(s.updated_at) : null;
      if (String(s.last_transaction_status || '').toUpperCase() === 'PENDING' && updatedAt) {
        const ageMs = Date.now() - updatedAt.getTime();
        if (ageMs < 30 * 60 * 1000) continue;
      }

      const empresaId = s.empresa_id;
      const planCodigo = s.plan_codigo || 'BASICO_MENSUAL';
      const paymentSourceId = s.wompi_payment_source_id;
      const customerEmail = s.customer_email || '';
      if (!empresaId || !paymentSourceId || !customerEmail) {
        await subModel.updateById(s.id, { status: 'past_due', last_error: 'Suscripción incompleta (faltan datos para cobro).' });
        continue;
      }

      const plan = await planModel.getByCodigo(planCodigo);
      if (!plan) {
        await subModel.updateById(s.id, { status: 'past_due', last_error: 'Plan no encontrado para cobro.' });
        continue;
      }

      const reference = `sub_${empresaId}_${Date.now()}`;
      const amountCents = toCentsCop(plan.precio_mensual);

      try {
        const tx = await createTransaction({
          amountInCents: amountCents,
          currency: 'COP',
          customerEmail,
          reference,
          paymentSourceId,
          acceptanceToken: acceptance_token,
        });

        await subModel.updateById(s.id, {
          last_transaction_id: tx?.id ? String(tx.id) : null,
          last_transaction_status: tx?.status ? String(tx.status) : null,
          last_error: null,
        });

        if (tx?.id) {
          await txModel.createIfNotExists({
            empresaId,
            subscriptionId: s.id,
            planCodigo,
            wompiTransactionId: String(tx.id),
            amountCents,
            currency: String(tx.currency || 'COP'),
            status: String(tx.status || ''),
            reference,
            rawEvent: { source: 'wompiRenewalCron', transaction: tx },
          });
        }
      } catch (e) {
        await subModel.updateById(s.id, {
          status: 'past_due',
          last_error: e.response?.data?.error?.message || e.message || 'Error al cobrar en Wompi',
        });
      }
    }
  } catch (e) {
    console.error('[Wompi cron] Error general:', e.message || e);
  }
}

function iniciarCronWompiRenewals() {
  // Cada 15 minutos para cubrir cobros y reintentos sin retraso.
  cron.schedule('*/15 * * * *', cobrarSuscripcionesVencidas);
  cobrarSuscripcionesVencidas().catch(() => {});
}

module.exports = { iniciarCronWompiRenewals };

