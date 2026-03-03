const axios = require('axios');
const webhookModel = require('../models/webhookModel');

const EVENTOS = {
  NUEVO_PEDIDO: 'nuevo_pedido',
  NUEVA_CITA: 'nueva_cita',
  NUEVO_CONTACTO: 'nuevo_contacto',
  NUEVO_LEAD: 'nuevo_lead',
};

async function dispararWebhooks(empresaId, evento, payload) {
  try {
    const hooks = await webhookModel.listarActivosPorEvento(empresaId, evento);
    if (!hooks.length) return;
    for (const hook of hooks) {
      const url = (hook.url || '').trim();
      if (!url) continue;
      const headers = hook.headers && typeof hook.headers === 'object' ? hook.headers : {};
      // No esperamos a que todos terminen; pero sí registramos errores en consola
      axios
        .post(url, { evento, data: payload }, { headers, timeout: 10000 })
        .catch((e) => {
          console.warn('[webhookService] Error enviando webhook', evento, url, e.message);
        });
    }
  } catch (e) {
    console.warn('[webhookService] Error general disparando webhooks', evento, e.message);
  }
}

module.exports = {
  EVENTOS,
  dispararWebhooks,
};

