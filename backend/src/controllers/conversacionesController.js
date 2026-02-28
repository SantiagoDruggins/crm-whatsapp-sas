const { listar, getById, actualizar, actualizarUltimoMensaje } = require('../models/conversacionModel');
const { listarPorConversacion, crear } = require('../models/mensajeModel');

async function listarConversaciones(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const conversaciones = await listar(empresaId, { limit: Number(req.query.limit) || 50, offset: Number(req.query.offset) || 0 });
    return res.status(200).json({ ok: true, conversaciones });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function obtenerConversacion(req, res) {
  try {
    const conversacion = await getById(req.user.empresaId, req.params.id);
    if (!conversacion) return res.status(404).json({ message: 'Conversación no encontrada' });
    return res.status(200).json({ ok: true, conversacion });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarConversacion(req, res) {
  try {
    const { estado, asignado_a, asignadoA } = req.body;
    const conversacion = await actualizar(req.user.empresaId, req.params.id, { estado, asignado_a: asignado_a ?? asignadoA });
    if (!conversacion) return res.status(404).json({ message: 'Conversación no encontrada' });
    return res.status(200).json({ ok: true, conversacion });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function historialConversacion(req, res) {
  try {
    const conversacion = await getById(req.user.empresaId, req.params.id);
    if (!conversacion) return res.status(404).json({ message: 'Conversación no encontrada' });
    const mensajes = await listarPorConversacion(req.user.empresaId, req.params.id, { limit: Number(req.query.limit) || 100, offset: Number(req.query.offset) || 0 });
    return res.status(200).json({ ok: true, conversacion, mensajes });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function enviarMensajeConversacion(req, res) {
  try {
    const { contenido } = req.body;
    if (!contenido?.trim()) return res.status(400).json({ message: 'contenido es requerido' });
    const conversacion = await getById(req.user.empresaId, req.params.id);
    if (!conversacion) return res.status(404).json({ message: 'Conversación no encontrada' });
    const mensaje = await crear(req.user.empresaId, conversacion.id, { origen: 'agente', usuarioId: req.user.id, contenido: contenido.trim(), esEntrada: false });
    await actualizarUltimoMensaje(conversacion.id);
    return res.status(201).json({ ok: true, mensaje });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = { listarConversaciones, obtenerConversacion, actualizarConversacion, historialConversacion, enviarMensajeConversacion };
