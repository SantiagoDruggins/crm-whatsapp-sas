const crypto = require('crypto');
const { query } = require('../config/db');
const pedidoModel = require('../models/pedidoModel');
const contactoModel = require('../models/contactoModel');
const { getEmpresaByShopifyShopDomain } = require('../models/empresaModel');

async function obtenerEmpresaPorTokenDropi(token) {
  if (!token) return null;
  const res = await query('SELECT id FROM empresas WHERE dropi_token = $1 LIMIT 1', [token]);
  return res.rows[0] || null;
}

async function obtenerEmpresaPorTokenMastershop(token) {
  if (!token) return null;
  const res = await query('SELECT id FROM empresas WHERE mastershop_token = $1 LIMIT 1', [token]);
  return res.rows[0] || null;
}

function extraerToken(req) {
  const fromQuery = (req.query.token || req.query.empresaToken || '').toString().trim();
  if (fromQuery) return fromQuery;
  const auth = (req.headers.authorization || '').toString();
  if (!auth) return '';
  const m = auth.match(/bearer\s+(.+)/i);
  return (m && m[1].trim()) || auth.trim();
}

function normalizarDatosPedidoDesdeBody(body) {
  const b = body || {};
  const reference = b.reference || b.id || b.order_id || b.orderId || b.numero || null;
  const total = Number(b.total || b.amount || b.monto || 0) || 0;
  const customer = b.customer || b.cliente || {};
  const shipping = b.shipping || b.envio || {};
  const telefono =
    customer.phone ||
    customer.telefono ||
    customer.celular ||
    shipping.phone ||
    shipping.telefono ||
    '';
  const nombre = customer.name || customer.nombre || '';
  const email = customer.email || customer.correo || '';
  return { reference, total, customer, shipping, telefono, nombre, email };
}

async function crearPedidoDesdeWebhook(empresaId, origen, body) {
  const { reference, total, customer, shipping, telefono, nombre, email } = normalizarDatosPedidoDesdeBody(body);

  let contacto = null;
  const phoneClean = (telefono || '').replace(/\D/g, '');
  if (phoneClean) {
    contacto = await contactoModel.getByTelefono(empresaId, phoneClean);
  }
  if (!contacto) {
    const baseNombre = nombre || (customer && (customer.name || customer.nombre)) || phoneClean || 'Cliente';
    contacto = await contactoModel.getOrCreateByTelefono(empresaId, phoneClean || reference || Date.now().toString());
    try {
      await contactoModel.actualizar(empresaId, contacto.id, {
        nombre: baseNombre,
        email: email || null,
      });
    } catch (e) {
      // ignorar errores de actualización de contacto
    }
  }

  const estado = (body.status || body.estado || '').toString().toLowerCase();
  const estadoNormalizado =
    estado && ['pendiente', 'pagado', 'en_proceso', 'enviado', 'cancelado'].includes(estado)
      ? estado
      : 'pagado';

  const pedido = await pedidoModel.crear(empresaId, {
    contacto_id: contacto?.id || null,
    conversacion_id: null,
    estado: estadoNormalizado,
    total,
    datos: body || {},
    direccion: shipping || {},
  });

  if (origen === 'dropi' && reference) {
    await pedidoModel.actualizarEnvioDropi(pedido.id, empresaId, String(reference));
  }
  if (origen === 'mastershop' && reference) {
    await pedidoModel.actualizarEnvioMastershop(pedido.id, empresaId, String(reference));
  }

  return pedido;
}

async function webhookDropi(req, res) {
  try {
    const token = extraerToken(req);
    const empresa = await obtenerEmpresaPorTokenDropi(token);
    if (!empresa?.id) return res.status(401).json({ message: 'Empresa no encontrada para este token de Dropi' });
    const pedido = await crearPedidoDesdeWebhook(empresa.id, 'dropi', req.body || {});
    return res.status(200).json({ ok: true, pedido_id: pedido.id });
  } catch (err) {
    console.error('webhookDropi:', err);
    return res.status(500).json({ message: err.message || 'Error procesando webhook de Dropi' });
  }
}

async function webhookMastershop(req, res) {
  try {
    const token = extraerToken(req);
    const empresa = await obtenerEmpresaPorTokenMastershop(token);
    if (!empresa?.id) return res.status(401).json({ message: 'Empresa no encontrada para este token de Mastershop' });
    const pedido = await crearPedidoDesdeWebhook(empresa.id, 'mastershop', req.body || {});
    return res.status(200).json({ ok: true, pedido_id: pedido.id });
  } catch (err) {
    console.error('webhookMastershop:', err);
    return res.status(500).json({ message: err.message || 'Error procesando webhook de Mastershop' });
  }
}

/** Normaliza el payload de un order de Shopify (orders/create) al formato que usa crearPedidoDesdeWebhook. */
function normalizarPedidoDesdeShopify(shopifyOrder) {
  const o = shopifyOrder || {};
  const id = o.id;
  const total = Number(o.total_price) || Number(o.total_price_set?.shop_money?.amount) || 0;
  const customer = o.customer || {};
  const shipping = o.shipping_address || o.billing_address || {};
  const nombre = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || (o.email || '').slice(0, 50);
  const email = customer.email || o.email || '';
  const telefono = customer.phone || shipping.phone || '';
  return {
    reference: id ? String(id) : null,
    total,
    customer: { name: nombre, email, phone: telefono },
    shipping: {
      first_name: shipping.first_name,
      last_name: shipping.last_name,
      address1: shipping.address1,
      city: shipping.city,
      province: shipping.province,
      country: shipping.country,
      zip: shipping.zip,
      phone: shipping.phone,
    },
    telefono,
    nombre,
    email,
    shopify_order_id: id ? String(id) : null,
    raw: o,
  };
}

/** Webhook Shopify: orders/create. req.body es el Buffer raw (para HMAC). */
async function webhookShopify(req, res) {
  try {
    const shopDomain = (req.headers['x-shopify-shop-domain'] || '').toString().trim();
    const hmacHeader = (req.headers['x-shopify-hmac-sha256'] || '').toString().trim();
    const rawBody = req.body;
    if (!shopDomain) return res.status(400).json({ message: 'Falta X-Shopify-Shop-Domain' });

    const empresa = await getEmpresaByShopifyShopDomain(shopDomain);
    if (!empresa?.id) return res.status(404).json({ message: 'Tienda Shopify no vinculada a ninguna empresa en el CRM' });

    if (empresa.shopify_webhook_secret && hmacHeader) {
      const hmac = crypto.createHmac('sha256', empresa.shopify_webhook_secret);
      hmac.update(Buffer.isBuffer(rawBody) ? rawBody : (typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)));
      const computed = hmac.digest('base64');
      if (computed !== hmacHeader) return res.status(401).json({ message: 'HMAC inválido' });
    }

    const body = Buffer.isBuffer(rawBody) ? JSON.parse(rawBody.toString('utf8')) : rawBody;
    const topic = (req.headers['x-shopify-topic'] || '').toString();
    if (topic !== 'orders/create' && topic !== 'orders/updated') {
      return res.status(200).json({ ok: true, message: 'Evento ignorado' });
    }

    const shopifyId = body?.id ? String(body.id) : null;
    if (shopifyId) {
      const existente = await pedidoModel.getByShopifyOrderId(empresa.id, shopifyId);
      if (existente) return res.status(200).json({ ok: true, pedido_id: existente.id, duplicate: true });
    }

    const normalizado = normalizarPedidoDesdeShopify(body);
    const { reference, total, customer, shipping, telefono, nombre, email, shopify_order_id } = normalizado;
    const payload = { reference, total, customer, shipping, telefono, nombre, email, status: body?.financial_status || 'paid' };
    const pedido = await crearPedidoDesdeWebhook(empresa.id, 'shopify', payload);
    if (shopify_order_id) {
      await query(`UPDATE pedidos SET shopify_order_id = $1 WHERE id = $2`, [shopify_order_id, pedido.id]);
    }
    return res.status(200).json({ ok: true, pedido_id: pedido.id });
  } catch (err) {
    console.error('webhookShopify:', err);
    return res.status(500).json({ message: err.message || 'Error procesando webhook de Shopify' });
  }
}

module.exports = {
  webhookDropi,
  webhookMastershop,
  webhookShopify,
};

