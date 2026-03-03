const { query } = require('../config/db');
const pedidoModel = require('../models/pedidoModel');
const contactoModel = require('../models/contactoModel');

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

module.exports = {
  webhookDropi,
  webhookMastershop,
};

