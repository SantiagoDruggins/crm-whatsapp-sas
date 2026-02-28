const pedidoModel = require('../models/pedidoModel');
const { getIntegracionesConfig } = require('../models/empresaModel');
const dropiService = require('../services/dropiService');
const mastershopService = require('../services/mastershopService');

async function listar(req, res) {
  try {
    const pedidos = await pedidoModel.listarPorEmpresa(req.user.empresaId, {
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    });
    return res.status(200).json({ ok: true, pedidos });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function crear(req, res) {
  try {
    const { contacto_id, conversacion_id, estado, total, datos, direccion } = req.body;
    const totalNum = Number(total) || 0;
    const pedido = await pedidoModel.crear(req.user.empresaId, {
      contacto_id: contacto_id || null,
      conversacion_id: conversacion_id || null,
      estado: estado || 'pendiente',
      total: totalNum,
      datos: datos || {},
      direccion: direccion || {},
    });
    const integraciones = await getIntegracionesConfig(req.user.empresaId);
    let dropiEnviado = null;
    let mastershopEnviado = null;
    if (integraciones?.dropi_activo && integraciones?.dropi_token) {
      const full = await pedidoModel.getById(req.user.empresaId, pedido.id);
      const result = await dropiService.enviarPedido(full, integraciones.dropi_token);
      if (result.ok && result.externalId) {
        await pedidoModel.actualizarEnvioDropi(pedido.id, req.user.empresaId, result.externalId);
        dropiEnviado = result.externalId;
      }
    }
    if (integraciones?.mastershop_activo && integraciones?.mastershop_token) {
      const full = await pedidoModel.getById(req.user.empresaId, pedido.id);
      const result = await mastershopService.enviarPedido(full, integraciones.mastershop_token);
      if (result.ok && result.externalId) {
        await pedidoModel.actualizarEnvioMastershop(pedido.id, req.user.empresaId, result.externalId);
        mastershopEnviado = result.externalId;
      }
    }
    const actualizado = await pedidoModel.getById(req.user.empresaId, pedido.id);
    return res.status(201).json({ ok: true, pedido: actualizado, dropi_enviado: dropiEnviado, mastershop_enviado: mastershopEnviado });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function obtener(req, res) {
  try {
    const pedido = await pedidoModel.getById(req.user.empresaId, req.params.id);
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });
    return res.status(200).json({ ok: true, pedido });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function syncDropi(req, res) {
  try {
    const pedido = await pedidoModel.getById(req.user.empresaId, req.params.id);
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });
    const integraciones = await getIntegracionesConfig(req.user.empresaId);
    if (!integraciones?.dropi_token) return res.status(400).json({ message: 'Configura el token de Dropi en Integraciones' });
    const result = await dropiService.enviarPedido(pedido, integraciones.dropi_token);
    if (!result.ok) return res.status(400).json({ message: result.error || 'Error al enviar a Dropi' });
    if (result.externalId) await pedidoModel.actualizarEnvioDropi(pedido.id, req.user.empresaId, result.externalId);
    const actualizado = await pedidoModel.getById(req.user.empresaId, pedido.id);
    return res.status(200).json({ ok: true, pedido: actualizado, external_id: result.externalId });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function syncMastershop(req, res) {
  try {
    const pedido = await pedidoModel.getById(req.user.empresaId, req.params.id);
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' });
    const integraciones = await getIntegracionesConfig(req.user.empresaId);
    if (!integraciones?.mastershop_token) return res.status(400).json({ message: 'Configura el token de Mastershop en Integraciones' });
    const result = await mastershopService.enviarPedido(pedido, integraciones.mastershop_token);
    if (!result.ok) return res.status(400).json({ message: result.error || 'Error al enviar a Mastershop' });
    if (result.externalId) await pedidoModel.actualizarEnvioMastershop(pedido.id, req.user.empresaId, result.externalId);
    const actualizado = await pedidoModel.getById(req.user.empresaId, pedido.id);
    return res.status(200).json({ ok: true, pedido: actualizado, external_id: result.externalId });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = { listar, crear, obtener, syncDropi, syncMastershop };
