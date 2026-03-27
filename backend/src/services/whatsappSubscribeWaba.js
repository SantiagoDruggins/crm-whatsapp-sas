const axios = require('axios');

const FB_GRAPH = 'https://graph.facebook.com/v19.0';

/**
 * Registra la app de Meta en el WABA para recibir webhooks (mensajes entrantes).
 * Sin esta llamada, a veces solo funciona el "Test" del panel y no llegan POST con chats reales.
 * @see https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/subscribed_apps/
 */
async function subscribeAppToWabaEdge(wabaId, accessToken) {
  const wid = String(wabaId || '').replace(/\s+/g, '').trim();
  if (!wid || !accessToken) return { ok: false, error: { message: 'Falta WABA o token' } };
  try {
    const r = await axios.post(`${FB_GRAPH}/${wid}/subscribed_apps`, {}, {
      params: { access_token: accessToken },
      timeout: 25000,
      headers: { 'Content-Type': 'application/json' },
    });
    return { ok: true, data: r.data };
  } catch (e) {
    const err = e.response?.data?.error;
    return { ok: false, error: err || { message: e.message } };
  }
}

module.exports = { subscribeAppToWabaEdge };
