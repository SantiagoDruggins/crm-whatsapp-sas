const { listar, getById, actualizar, actualizarUltimoMensaje, desmarcarPideAgente, countPideAgente } = require('../models/conversacionModel');
const { listarPorConversacion, crear } = require('../models/mensajeModel');
const { enviarMensajeEmpresa, enviarAudioTtsEmpresa } = require('./whatsappController');
const contactoModel = require('../models/contactoModel');

async function listarConversaciones(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const pideAgenteOnly = req.query.pide_agente === '1' || req.query.pide_agente === 'true';
    const [conversaciones, pideAgenteCount] = await Promise.all([
      listar(empresaId, { limit: Number(req.query.limit) || 50, offset: Number(req.query.offset) || 0, pideAgente: pideAgenteOnly }),
      countPideAgente(empresaId),
    ]);
    return res.status(200).json({ ok: true, conversaciones, pideAgenteCount });
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
    const { contenido, enviar_audio } = req.body;
    if (!contenido?.trim()) return res.status(400).json({ message: 'contenido es requerido' });
    const conversacion = await getById(req.user.empresaId, req.params.id);
    if (!conversacion) return res.status(404).json({ message: 'Conversación no encontrada' });
    const texto = contenido.trim();
    const mensaje = await crear(req.user.empresaId, conversacion.id, { origen: 'agente', usuarioId: req.user.id, contenido: texto, esEntrada: false });
    await actualizarUltimoMensaje(conversacion.id);
    let telefono = conversacion.contacto_telefono;
    if (!telefono && conversacion.contacto_id) {
      const contacto = await contactoModel.getById(req.user.empresaId, conversacion.contacto_id);
      telefono = contacto?.telefono;
    }
    let enviadoWhatsApp = false;
    let enviadoAudio = false;
    let errorAudio = null;
    if (telefono) {
      const sent = await enviarMensajeEmpresa(req.user.empresaId, telefono, texto);
      if (!sent.ok) {
        return res.status(201).json({ ok: true, mensaje, enviadoWhatsApp: false, error: sent.error || 'No se pudo enviar por WhatsApp' });
      }
      enviadoWhatsApp = true;
      const wantsAudio = enviar_audio === true || enviar_audio === 1 || enviar_audio === '1' || enviar_audio === 'true';
      if (wantsAudio) {
        const a = await enviarAudioTtsEmpresa(req.user.empresaId, telefono, texto);
        if (a?.ok) enviadoAudio = true;
        else errorAudio = a?.error || 'No se pudo enviar audio';
      }
    }
    if (conversacion.contacto_id) {
      try {
        await contactoModel.actualizarUltimoMensajeContacto(req.user.empresaId, conversacion.contacto_id, { lastMessage: texto, lastMessageAt: new Date() });
      } catch (e) {}
    }
    await desmarcarPideAgente(conversacion.id);
    return res.status(201).json({ ok: true, mensaje, enviadoWhatsApp, enviadoAudio, errorAudio });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = { listarConversaciones, obtenerConversacion, actualizarConversacion, historialConversacion, enviarMensajeConversacion };
