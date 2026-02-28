const axios = require('axios');
const config = require('../config/env');

/**
 * Envía un pedido a Mastershop (dropshipping).
 * Cuando tengas la URL base y formato de la API, configura MASTERSHOP_API_BASE_URL en .env.
 * @param {object} pedido - { id, total, datos, direccion, contacto_nombre, contacto_telefono, contacto_email }
 * @param {string} token - Token/API key de Mastershop de la empresa
 * @returns {{ ok: boolean, externalId?: string, error?: string }}
 */
async function enviarPedido(pedido, token) {
  if (!token?.trim()) return { ok: false, error: 'Falta token de Mastershop' };
  const baseUrl = (config.mastershop?.apiBaseUrl || '').trim();
  if (!baseUrl) {
    return { ok: false, error: 'Integración Mastershop no configurada en el servidor (MASTERSHOP_API_BASE_URL). Contacta al administrador.' };
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
        [config.mastershop?.apiKeyHeader || 'Authorization']: `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    const externalId = res.data?.id ?? res.data?.order_id ?? res.data?.reference ?? null;
    return { ok: true, externalId: externalId ? String(externalId) : undefined };
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || err.message;
    return { ok: false, error: msg || 'Error al conectar con Mastershop' };
  }
}

module.exports = { enviarPedido };
