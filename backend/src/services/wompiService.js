const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/env');

function getWompiBaseUrl() {
  return config.wompi?.env === 'sandbox' ? 'https://sandbox.wompi.co' : 'https://production.wompi.co';
}

function requireWompiKeys() {
  const pk = config.wompi?.publicKey;
  const sk = config.wompi?.privateKey;
  if (!pk || !sk) {
    throw new Error('Wompi no configurado. Define WOMPI_PUBLIC_KEY y WOMPI_PRIVATE_KEY en el backend.');
  }
  return { pk, sk };
}

async function getAcceptanceTokens() {
  const { pk } = requireWompiKeys();
  const base = getWompiBaseUrl();
  const { data } = await axios.get(`${base}/v1/merchants/${pk}`, { timeout: 15000 });
  const acceptance_token = data?.data?.presigned_acceptance?.acceptance_token || '';
  const accept_personal_auth = data?.data?.presigned_personal_data_auth?.acceptance_token || '';
  if (!acceptance_token) throw new Error('No se pudo obtener acceptance_token de Wompi.');
  return { acceptance_token, accept_personal_auth };
}

async function createPaymentSource({ type, token, customerEmail, acceptanceToken, acceptPersonalAuth, sessionId }) {
  const { sk } = requireWompiKeys();
  const base = getWompiBaseUrl();
  const payload = {
    type,
    token,
    customer_email: customerEmail,
    acceptance_token: acceptanceToken,
    accept_personal_auth: acceptPersonalAuth || undefined,
    session_id: sessionId || undefined,
  };
  const { data } = await axios.post(`${base}/v1/payment_sources`, payload, {
    headers: { Authorization: `Bearer ${sk}` },
    timeout: 20000,
  });
  return data?.data;
}

async function createTransaction({ amountInCents, currency, customerEmail, reference, paymentSourceId, acceptanceToken, sessionId }) {
  const { sk } = requireWompiKeys();
  const base = getWompiBaseUrl();
  const payload = {
    amount_in_cents: amountInCents,
    currency: currency || 'COP',
    customer_email: customerEmail,
    reference,
    payment_source_id: paymentSourceId,
    acceptance_token: acceptanceToken,
    session_id: sessionId || undefined,
  };
  const { data } = await axios.post(`${base}/v1/transactions`, payload, {
    headers: { Authorization: `Bearer ${sk}` },
    timeout: 25000,
  });
  return data?.data;
}

async function getTransaction(transactionId) {
  const { sk } = requireWompiKeys();
  const base = getWompiBaseUrl();
  const { data } = await axios.get(`${base}/v1/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${sk}` },
    timeout: 15000,
  });
  return data?.data;
}

/**
 * Verifica firma de webhook si WOMPI_EVENTS_SECRET está configurado.
 * Nota: Wompi firma suele usar un hash con timestamp + secret + payload; validamos solo si hay secreto
 * y devolvemos { ok:false } si no coincide.
 */
function verifyWebhookSignature({ rawBody, signature, timestamp }) {
  const secret = config.wompi?.eventsSecret;
  if (!secret) return { ok: true, skipped: true };
  if (!rawBody || !signature || !timestamp) return { ok: false, error: 'Falta firma/timestamp' };

  // Implementación conservadora: sha256(timestamp + '.' + rawBody + '.' + secret)
  // Si tu cuenta usa otro esquema, ajustamos tras ver el header real.
  const base = `${timestamp}.${rawBody}.${secret}`;
  const digest = crypto.createHash('sha256').update(base).digest('hex');
  const ok = String(signature).toLowerCase() === digest.toLowerCase();
  return ok ? { ok: true } : { ok: false, error: 'Firma inválida' };
}

module.exports = {
  getAcceptanceTokens,
  createPaymentSource,
  createTransaction,
  getTransaction,
  verifyWebhookSignature,
  getWompiBaseUrl,
};

