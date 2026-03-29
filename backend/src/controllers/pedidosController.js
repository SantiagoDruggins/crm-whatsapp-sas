const pedidoModel = require('../models/pedidoModel');
const { EVENTOS, dispararWebhooks } = require('../services/webhookService');

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
    const empresaId = req.user.empresaId;
    const pedido = await pedidoModel.crear(empresaId, {
      contacto_id: contacto_id || null,
      conversacion_id: conversacion_id || null,
      estado: estado || 'pendiente',
      total: totalNum,
      datos: datos || {},
      direccion: direccion || {},
    });
    // Webhook: nuevo pedido
    dispararWebhooks(empresaId, EVENTOS.NUEVO_PEDIDO, {
      tipo: 'pedido',
      pedido,
    });

    const actualizado = await pedidoModel.getById(empresaId, pedido.id);
    return res.status(201).json({ ok: true, pedido: actualizado });
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

module.exports = { listar, crear, obtener };
