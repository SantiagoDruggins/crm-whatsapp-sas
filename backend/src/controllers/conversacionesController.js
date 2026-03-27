const { listar, getById, actualizar, actualizarUltimoMensaje, marcarPideAgente, desmarcarPideAgente, countPideAgente } = require('../models/conversacionModel');
const { listarPorConversacion, crear } = require('../models/mensajeModel');
const conversationStateModel = require('../models/conversationStateModel');
const { enviarMensajeEmpresa } = require('./whatsappController');
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
    const { contenido } = req.body;
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
    if (telefono) {
      const sent = await enviarMensajeEmpresa(req.user.empresaId, telefono, texto);
      if (!sent.ok) {
        return res.status(201).json({ ok: true, mensaje, enviadoWhatsApp: false, error: sent.error || 'No se pudo enviar por WhatsApp' });
      }
      enviadoWhatsApp = true;
    }
    if (conversacion.contacto_id) {
      try {
        await contactoModel.actualizarUltimoMensajeContacto(req.user.empresaId, conversacion.contacto_id, { lastMessage: texto, lastMessageAt: new Date() });
      } catch (e) {}
      try {
        await conversationStateModel.setMotorState(req.user.empresaId, conversacion.contacto_id, {
          estado_operativo: 'asesor_activo',
          intencion_actual: 'humano',
          paso_actual: 'asesor_respondio',
          bloqueo_bot: true,
          updated_by: 'agente_crm',
        });
      } catch (e) {}
    }
    await desmarcarPideAgente(conversacion.id);
    return res.status(201).json({ ok: true, mensaje, enviadoWhatsApp });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function obtenerMotorConversacion(req, res) {
  try {
    const conversacion = await getById(req.user.empresaId, req.params.id);
    if (!conversacion) return res.status(404).json({ message: 'Conversación no encontrada' });
    const state = conversacion.contacto_id
      ? await conversationStateModel.get(req.user.empresaId, conversacion.contacto_id)
      : null;
    const motor = state?.context_data?.motor_conversacion || {};
    return res.status(200).json({
      ok: true,
      motor: {
        estado_operativo: motor.estado_operativo || state?.current_state || 'bot_activo',
        intencion_actual: motor.intencion_actual || state?.last_intent || 'soporte',
        paso_actual: motor.paso_actual || 'sin_definir',
        bloqueo_bot: typeof motor.bloqueo_bot === 'boolean' ? motor.bloqueo_bot : !!conversacion.pide_agente_humano,
        updated_by: motor.updated_by || null,
        updated_at_iso: motor.updated_at_iso || state?.updated_at || null,
      },
      pide_agente_humano: !!conversacion.pide_agente_humano,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarMotorConversacion(req, res) {
  try {
    const conversacion = await getById(req.user.empresaId, req.params.id);
    if (!conversacion) return res.status(404).json({ message: 'Conversación no encontrada' });
    if (!conversacion.contacto_id) return res.status(400).json({ message: 'La conversación no tiene contacto asociado' });
    const accion = String(req.body?.accion || '').trim().toLowerCase();
    if (!accion) return res.status(400).json({ message: 'accion es requerida' });

    if (accion === 'pasar_asesor') {
      await marcarPideAgente(conversacion.id);
      await conversationStateModel.setMotorState(req.user.empresaId, conversacion.contacto_id, {
        estado_operativo: 'espera_asesor',
        intencion_actual: 'humano',
        paso_actual: 'derivado_desde_crm',
        bloqueo_bot: true,
        updated_by: 'crm_accion_manual',
      });
    } else if (accion === 'reactivar_bot') {
      await desmarcarPideAgente(conversacion.id);
      await conversationStateModel.setMotorState(req.user.empresaId, conversacion.contacto_id, {
        estado_operativo: 'bot_activo',
        intencion_actual: 'soporte',
        paso_actual: 'reactivado_desde_crm',
        bloqueo_bot: false,
        updated_by: 'crm_accion_manual',
      });
    } else {
      return res.status(400).json({ message: 'Acción inválida. Usa pasar_asesor o reactivar_bot' });
    }

    return obtenerMotorConversacion(req, res);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = {
  listarConversaciones,
  obtenerConversacion,
  actualizarConversacion,
  historialConversacion,
  enviarMensajeConversacion,
  obtenerMotorConversacion,
  actualizarMotorConversacion,
};
