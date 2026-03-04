const axios = require('axios');
const config = require('../config/env');

/**
 * Envía un pedido a Dropi (dropshipping).
 * @param {object} pedido - { id, total, datos, direccion, contacto_nombre, contacto_telefono, contacto_email }
 * @param {string} token - Token de integración Dropi de la empresa
 * @param {string} [apiBaseUrl] - URL base de la API de Dropi (opcional; si la empresa la configuró en Integraciones)
 * @returns {{ ok: boolean, externalId?: string, error?: string }}
 */
async function enviarPedido(pedido, token, apiBaseUrl) {
  if (!token?.trim()) return { ok: false, error: 'Falta token de Dropi' };
  const baseUrl = (apiBaseUrl || config.dropi?.apiBaseUrl || '').trim();
  if (!baseUrl) {
    return { ok: false, error: 'Configura la URL base de la API de Dropi en Integraciones (ej. https://api.dropi.co) o pide al administrador que configure DROPI_API_BASE_URL en el servidor.' };
  }
  const url = `${baseUrl.replace(/\/$/, '')}/orders`;
  const payload = {
    reference: String(pedido.id),
    total: Number(pedido.total) || 0,
    items: Array.isArray(pedido.datos?.items) ? pedido.datos.items : [],
    shipping: pedido.direccion || {},
    customer: {
      name: pedido.contacto_nombre || '',
      phone: pedido.contacto_telefono || '',
      email: pedido.contacto_email || '',
    },
  };
  try {
    const res = await axios.post(url, payload, {
      headers: {
        [config.dropi?.apiKeyHeader || 'Authorization']: `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    const externalId = res.data?.id ?? res.data?.order_id ?? res.data?.reference ?? null;
    return { ok: true, externalId: externalId ? String(externalId) : undefined };
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || err.message;
    return { ok: false, error: msg || 'Error al conectar con Dropi' };
  }
}

module.exports = { enviarPedido };
