const crypto = require('crypto');
const config = require('../config/env');
const planModel = require('../models/planModel');
const { query } = require('../config/db');
const subModel = require('../models/wompiSubscriptionModel');
const txModel = require('../models/wompiTransactionModel');
const {
  getAcceptanceTokens,
  createPaymentSource,
  createTransaction,
  getTransaction,
  verifyWebhookSignature,
  getUsdCopRate,
} = require('../services/wompiService');
const { applyRewardForPaidReferral } = require('../models/affiliateModel');

function toCentsCop(precioMensual) {
  const n = Number(precioMensual || 0);
  if (Number.isNaN(n) || n < 0) return 0;
  // Wompi usa amount_in_cents. Para COP: pesos * 100.
  return Math.round(n * 100);
}

/** Firma SHA256 para Widget / Web Checkout (docs Wompi: referencia + monto + moneda + secreto). */
function buildWidgetIntegritySignature({ reference, amountInCents, currency, expirationTime, integritySecret }) {
  let cadena = `${reference}${amountInCents}${currency || 'COP'}`;
  if (expirationTime) cadena += expirationTime;
  cadena += integritySecret;
  return crypto.createHash('sha256').update(cadena).digest('hex');
}

function publicAppBaseUrl(req) {
  const fromEnv = (config.publicBaseUrl || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host) return '';
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').replace(/:$/, '');
  return `${proto}://${host}`;
}

async function activarORenovarEmpresa({ empresaId, planCodigo }) {
  const plan = await planModel.getByCodigo(planCodigo);
  const duracionDias = plan ? (plan.duracion_dias || 30) : 30;
  const emp = await query(`SELECT fecha_expiracion FROM empresas WHERE id = $1`, [empresaId]);
  const current = emp.rows[0]?.fecha_expiracion ? new Date(emp.rows[0].fecha_expiracion) : null;
  const base = current && current > new Date() ? current : new Date();
  const fechaFin = new Date(base.getTime() + duracionDias * 24 * 60 * 60 * 1000);
  await query(
    `UPDATE empresas
     SET estado = 'activa', plan = $2, fecha_expiracion = $3, updated_at = now()
     WHERE id = $1`,
    [empresaId, planCodigo, fechaFin]
  );
  return { duracionDias, fechaFin };
}

async function getPublicConfig(req, res) {
  try {
    const pk = config.wompi?.publicKey || '';
    const env = config.wompi?.env || 'production';
    if (!pk) return res.status(503).json({ message: 'Wompi no configurado en el servidor.' });
    const tokens = await getAcceptanceTokens();
    const widgetCheckoutEnabled = !!(config.wompi?.integritySecret && pk);
    return res.status(200).json({ ok: true, env, publicKey: pk, widgetCheckoutEnabled, ...tokens });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

/**
 * GET /api/wompi/fx-quote?plan_codigo=...&currency=USD
 * Devuelve referencia internacional para explicar cobro COP en Wompi.
 */
async function getFxQuote(req, res) {
  try {
    const planCodigo = String(req.query?.plan_codigo || '').trim();
    const currency = String(req.query?.currency || 'USD').trim().toUpperCase();
    if (!planCodigo) return res.status(400).json({ message: 'plan_codigo es requerido' });
    if (currency !== 'USD') return res.status(400).json({ message: 'currency soportada por ahora: USD' });
    const plan = await planModel.getByCodigo(planCodigo);
    if (!plan) return res.status(404).json({ message: 'Plan no encontrado' });
    const amountCop = Number(plan.precio_mensual || 0);
    const rate = await getUsdCopRate();
    const approxUsd = rate > 0 ? amountCop / rate : 0;
    return res.status(200).json({
      ok: true,
      quote: {
        plan_codigo: planCodigo,
        base_currency: 'COP',
        display_currency: 'USD',
        amount_cop: Math.round(amountCop),
        fx_rate_usd_cop: rate,
        approx_amount_usd: Number(approxUsd.toFixed(2)),
        disclaimer:
          'Cobro procesado en COP por Wompi. El banco del cliente puede aplicar una tasa/costo diferente al momento del cargo.',
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

/**
 * POST /api/wompi/subscription/widget-checkout
 * Prepara datos firmados para WidgetCheckout (modal oficial). Registra plan en suscripción como pending_checkout.
 */
async function getWidgetCheckoutParams(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });

    const pk = config.wompi?.publicKey || '';
    const integritySecret = config.wompi?.integritySecret || '';
    if (!pk || !integritySecret) {
      return res.status(503).json({
        message:
          'Falta WOMPI_INTEGRITY_SECRET (Dashboard → Desarrolladores → Secreto de integridad) o llave pública.',
      });
    }

    const planCodigo = String(req.body?.plan_codigo || '').trim();
    if (!planCodigo) return res.status(400).json({ message: 'plan_codigo es requerido' });

    const plan = await planModel.getByCodigo(planCodigo);
    if (!plan) return res.status(404).json({ message: 'Plan no encontrado' });

    const customerEmail = String(req.body?.customer_email || req.user?.email || '').trim();
    if (!customerEmail) return res.status(400).json({ message: 'Se requiere email del pagador (customer_email o usuario con email).' });

    const reference = `sub_${empresaId}_${Date.now()}`;
    const amountInCents = toCentsCop(plan.precio_mensual);
    const currency = 'COP';
    const signatureIntegrity = buildWidgetIntegritySignature({
      reference,
      amountInCents,
      currency,
      expirationTime: null,
      integritySecret,
    });

    await subModel.upsertForEmpresa(empresaId, {
      plan_codigo: planCodigo,
      status: 'pending_checkout',
      customer_email: customerEmail,
      next_charge_at: null,
      last_error: null,
    });

    const base = publicAppBaseUrl(req);
    const redirectUrl = base ? `${base}/dashboard/pagos` : undefined;

    return res.status(200).json({
      ok: true,
      widget: {
        publicKey: pk,
        currency,
        amountInCents,
        reference,
        signature: { integrity: signatureIntegrity },
        redirectUrl: redirectUrl || null,
        customerData: {
          email: customerEmail,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

/**
 * POST /api/wompi/subscription/start
 * Body: { plan_codigo, payment_method_type, payment_method_token, customer_email }
 *
 * Crea payment_source y transacción inicial. La activación del plan ocurre al webhook APPROVED.
 */
async function startSubscription(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });

    const planCodigo = String(req.body?.plan_codigo || '').trim();
    const paymentMethodType = String(req.body?.payment_method_type || '').trim().toUpperCase();
    const paymentMethodToken = String(req.body?.payment_method_token || '').trim();
    const customerEmail = String(req.body?.customer_email || req.user?.email || '').trim();
    const sessionId = req.body?.session_id ? String(req.body.session_id).trim() : '';

    if (!planCodigo) return res.status(400).json({ message: 'plan_codigo es requerido' });
    if (!paymentMethodType || !['CARD', 'NEQUI', 'DAVIPLATA', 'BANCOLOMBIA_TRANSFER'].includes(paymentMethodType)) {
      return res.status(400).json({ message: 'payment_method_type inválido' });
    }
    if (!paymentMethodToken) return res.status(400).json({ message: 'payment_method_token es requerido' });
    if (!customerEmail) return res.status(400).json({ message: 'customer_email es requerido' });

    const plan = await planModel.getByCodigo(planCodigo);
    if (!plan) return res.status(404).json({ message: 'Plan no encontrado' });

    const { acceptance_token, accept_personal_auth } = await getAcceptanceTokens();

    const ps = await createPaymentSource({
      type: paymentMethodType,
      token: paymentMethodToken,
      customerEmail,
      acceptanceToken: acceptance_token,
      acceptPersonalAuth: accept_personal_auth,
      sessionId,
    });
    if (!ps?.id) return res.status(502).json({ message: 'No se pudo crear payment_source en Wompi' });

    const reference = `sub_${empresaId}_${Date.now()}`;
    const amountCents = toCentsCop(plan.precio_mensual);

    const tx = await createTransaction({
      amountInCents: amountCents,
      currency: 'COP',
      customerEmail,
      reference,
      paymentSourceId: ps.id,
      acceptanceToken: acceptance_token,
      sessionId,
    });
    if (!tx?.id) return res.status(502).json({ message: 'No se pudo crear transacción en Wompi' });

    const nextChargeAt = plan.es_pago_unico
      ? null
      : new Date(Date.now() + (Number(plan.duracion_dias || 30) * 24 * 60 * 60 * 1000));
    const subscription = await subModel.upsertForEmpresa(empresaId, {
      plan_codigo: planCodigo,
      status: 'active',
      wompi_payment_source_id: ps.id,
      customer_email: customerEmail,
      next_charge_at: nextChargeAt,
      last_transaction_id: String(tx.id),
      last_transaction_status: String(tx.status || ''),
      last_error: null,
    });

    await txModel.createIfNotExists({
      empresaId,
      subscriptionId: subscription?.id,
      planCodigo,
      wompiTransactionId: String(tx.id),
      amountCents,
      currency: String(tx.currency || 'COP'),
      status: String(tx.status || ''),
      reference,
      rawEvent: { source: 'startSubscription', transaction: tx },
    });

    return res.status(200).json({
      ok: true,
      subscription,
      wompi: {
        transaction_id: tx.id,
        status: tx.status,
        reference,
      },
      message: 'Transacción creada. Se activará el plan cuando Wompi la marque como APPROVED.',
    });
  } catch (err) {
    return res.status(500).json({ message: err.response?.data?.error?.message || err.message || 'Error' });
  }
}

async function subscriptionStatus(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const sub = await subModel.getByEmpresaId(empresaId);
    return res.status(200).json({ ok: true, subscription: sub || null });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function listMyTransactions(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const rows = await txModel.listByEmpresaId(empresaId, Number(req.query.limit) || 50);
    return res.status(200).json({ ok: true, transactions: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function cancelSubscription(req, res) {
  try {
    const empresaId = req.user?.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const sub = await subModel.getByEmpresaId(empresaId);
    if (!sub) return res.status(404).json({ message: 'No hay suscripción' });
    const updated = await subModel.updateById(sub.id, { status: 'canceled', next_charge_at: null });
    return res.status(200).json({ ok: true, subscription: updated, message: 'Suscripción cancelada en el CRM.' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

/**
 * POST /api/wompi/webhook
 * Body: evento de Wompi (transaction.updated). Responde 200 rápido e idempotente.
 */
async function wompiWebhook(req, res) {
  try {
    // Responder 200 rápido: Wompi reintenta si hay demora.
    res.status(200).json({ ok: true });

    const rawBody = typeof req.rawBody === 'string' ? req.rawBody : '';
    const sig = req.headers['x-wompi-signature'] || req.headers['x-signature'] || '';
    const ts = req.headers['x-wompi-timestamp'] || req.headers['x-timestamp'] || '';
    const ver = verifyWebhookSignature({ rawBody, signature: sig, timestamp: ts });
    if (!ver.ok) {
      console.warn('[Wompi webhook] Firma inválida:', ver.error);
      return;
    }

    const body = req.body && typeof req.body === 'object' ? req.body : null;
    if (!body) return;

    const event = String(body.event || body.type || '').trim();
    const tx = body?.data?.transaction || body?.data?.object || body?.transaction || null;
    const txId = tx?.id ? String(tx.id) : '';
    const status = tx?.status ? String(tx.status) : '';
    const reference = tx?.reference ? String(tx.reference) : '';
    const amountCents = Number(tx?.amount_in_cents || 0);
    const currency = String(tx?.currency || 'COP');
    const customerEmail = String(tx?.customer_email || '');

    if (!txId) return;

    // Extraer empresaId del reference: sub_<UUID>_<timestamp>
    let empresaId = null;
    let planCodigo = null;
    const matchUuid = reference.match(
      /^sub_([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})_(\d+)$/
    );
    if (matchUuid) {
      empresaId = matchUuid[1];
    }

    if (!empresaId) {
      // fallback: no se puede asociar
      console.warn('[Wompi webhook] No se pudo asociar empresa desde reference:', reference);
      return;
    }

    const sub = await subModel.getByEmpresaId(empresaId);
    planCodigo = sub?.plan_codigo || null;

    const inserted = await txModel.createIfNotExists({
      empresaId,
      subscriptionId: sub?.id,
      planCodigo,
      wompiTransactionId: txId,
      amountCents: Number.isFinite(amountCents) ? amountCents : 0,
      currency,
      status,
      reference,
      rawEvent: body,
    });

    // Si ya existía, igual actualizamos status en caso de cambio.
    if (!inserted) {
      await txModel.updateStatusByWompiId(txId, status);
    }

    let subStatus = sub?.status || 'pending_checkout';
    if (status === 'APPROVED') subStatus = 'active';
    else if (status === 'DECLINED') subStatus = 'past_due';
    // PENDING / otros: conservar pending_checkout o estado previo (no forzar "active").

    await subModel.upsertForEmpresa(empresaId, {
      plan_codigo: planCodigo || 'BASICO_MENSUAL',
      status: subStatus,
      customer_email: customerEmail || sub?.customer_email || null,
      last_transaction_id: txId,
      last_transaction_status: status,
      last_error: status === 'DECLINED' ? 'Transacción rechazada' : null,
    });

    if (status === 'APPROVED') {
      const finalPlan = planCodigo || 'BASICO_MENSUAL';
      const planDef = await planModel.getByCodigo(finalPlan);
      const { duracionDias, fechaFin } = await activarORenovarEmpresa({ empresaId, planCodigo: finalPlan });
      const nextChargeAt = planDef?.es_pago_unico ? null : new Date(fechaFin.getTime());
      let paymentSourceId =
        tx.payment_source_id != null
          ? Number(tx.payment_source_id)
          : tx.payment_source?.id != null
            ? Number(tx.payment_source.id)
            : null;
      if (!paymentSourceId && txId) {
        try {
          const full = await getTransaction(txId);
          const ps =
            full?.payment_source_id != null
              ? Number(full.payment_source_id)
              : full?.payment_source?.id != null
                ? Number(full.payment_source.id)
                : null;
          if (Number.isFinite(ps)) paymentSourceId = ps;
        } catch (_) {
          /* ignore */
        }
      }
      await subModel.upsertForEmpresa(empresaId, {
        plan_codigo: finalPlan,
        status: 'active',
        next_charge_at: nextChargeAt,
        last_transaction_id: txId,
        last_transaction_status: status,
        last_error: null,
        ...(paymentSourceId && Number.isFinite(paymentSourceId) ? { wompi_payment_source_id: paymentSourceId } : {}),
      });
      if (planDef?.es_pago_unico) {
        await query(`UPDATE empresas SET marca_blanca = true, marca_blanca_pagado_at = now(), updated_at = now() WHERE id = $1`, [
          empresaId,
        ]);
      }
      try {
        const reward = await applyRewardForPaidReferral(empresaId);
        if (reward?.rewarded) {
          console.log('[Wompi webhook] Recompensa de afiliado aplicada', {
            empresaReferidaId: empresaId,
            empresaCreadoraId: reward.empresaCreadoraId,
            rewardDays: reward.rewardDays,
          });
        }
      } catch (e) {
        console.warn('[Wompi webhook] Error aplicando recompensa de afiliado:', e.message || e);
      }
      console.log('[Wompi webhook] Pago aprobado. Empresa renovada', { empresaId, plan: finalPlan, duracionDias });
    }

    if (event) {
      // solo para trazabilidad
      console.log('[Wompi webhook] Evento', event, { txId, status, empresaId });
    }
  } catch (err) {
    console.error('[Wompi webhook] Error:', err.message || err);
  }
}

module.exports = {
  getPublicConfig,
  getFxQuote,
  getWidgetCheckoutParams,
  startSubscription,
  subscriptionStatus,
  listMyTransactions,
  cancelSubscription,
  wompiWebhook,
};

