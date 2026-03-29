const path = require('path');
const { listar, getById, actualizar, actualizarUltimoMensaje, marcarPideAgente, desmarcarPideAgente, countPideAgente } = require('../models/conversacionModel');
const { listarPorConversacion, crear } = require('../models/mensajeModel');
const conversationStateModel = require('../models/conversationStateModel');
const {
  enviarMensajeEmpresa,
  enviarAudioTtsEmpresa,
  enviarAudioArchivoEmpresa,
  enviarImagenEmpresa,
  enviarDocumentoEmpresa,
  resolvePublicMediaUrl,
  verificarUrlImagenPublica,
} = require('./whatsappController');
const contactoModel = require('../models/contactoModel');
const productoModel = require('../models/productoModel');
const { scheduleLeadClassification } = require('../services/leadClassifierService');
const { userCan } = require('../lib/crmPermissions');

function notificarClasificacionLeadSiAplica(empresaId, conversacion) {
  if (conversacion?.contacto_id) {
    scheduleLeadClassification(empresaId, conversacion.contacto_id, conversacion.id);
  }
}

async function listarConversaciones(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const pideAgenteOnly = req.query.pide_agente === '1' || req.query.pide_agente === 'true';
    if (pideAgenteOnly && !userCan(req, 'pide_agente')) {
      return res.status(403).json({ message: 'No tienes permiso para ver “Pide agente”.', code: 'CRM_FORBIDDEN' });
    }
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
        notificarClasificacionLeadSiAplica(req.user.empresaId, conversacion);
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
    notificarClasificacionLeadSiAplica(req.user.empresaId, conversacion);
    return res.status(201).json({ ok: true, mensaje, enviadoWhatsApp, enviadoAudio, errorAudio });
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
    const modoInicialRaw = String(req.body?.modo_inicial || '').trim().toLowerCase();
    const modoInicial = ['soporte', 'pedidos', 'agenda'].includes(modoInicialRaw) ? modoInicialRaw : 'soporte';
    const intentFromModo = modoInicial === 'pedidos' ? 'pedido' : modoInicial === 'agenda' ? 'agenda' : 'soporte';
    const pasoFromModo = modoInicial === 'pedidos' ? 'reactivado_en_pedidos' : modoInicial === 'agenda' ? 'reactivado_en_agenda' : 'reactivado_en_soporte';

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
        intencion_actual: intentFromModo,
        paso_actual: pasoFromModo,
        bloqueo_bot: false,
        updated_by: 'crm_accion_manual',
        extra: { modo_inicial: modoInicial },
      });
    } else {
      return res.status(400).json({ message: 'Acción inválida. Usa pasar_asesor o reactivar_bot' });
    }

    return obtenerMotorConversacion(req, res);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function enviarAudioConversacion(req, res) {
  try {
    const conversacion = await getById(req.user.empresaId, req.params.id);
    if (!conversacion) return res.status(404).json({ message: 'Conversación no encontrada' });
    if (!req.file?.buffer) return res.status(400).json({ message: 'audio es requerido' });

    let telefono = conversacion.contacto_telefono;
    if (!telefono && conversacion.contacto_id) {
      const contacto = await contactoModel.getById(req.user.empresaId, conversacion.contacto_id);
      telefono = contacto?.telefono;
    }
    if (!telefono) return res.status(400).json({ message: 'No hay teléfono del contacto' });

    const sent = await enviarAudioArchivoEmpresa(
      req.user.empresaId,
      telefono,
      req.file.buffer,
      req.file.mimetype || 'audio/ogg'
    );
    if (!sent.ok) {
      return res.status(400).json({ ok: false, message: sent.error || 'No se pudo enviar audio' });
    }

    const mensaje = await crear(req.user.empresaId, conversacion.id, {
      origen: 'agente',
      usuarioId: req.user.id,
      contenido: '[nota de voz enviada]',
      esEntrada: false,
      message_type: 'audio',
      media_url: null,
    });
    await actualizarUltimoMensaje(conversacion.id);
    if (conversacion.contacto_id) {
      try {
        await contactoModel.actualizarUltimoMensajeContacto(req.user.empresaId, conversacion.contacto_id, {
          lastMessage: '[nota de voz enviada]',
          lastMessageAt: new Date(),
        });
      } catch (e) {}
      try {
        await conversationStateModel.setMotorState(req.user.empresaId, conversacion.contacto_id, {
          estado_operativo: 'asesor_activo',
          intencion_actual: 'humano',
          paso_actual: 'asesor_envio_audio',
          bloqueo_bot: true,
          updated_by: 'agente_crm_audio',
        });
      } catch (e) {}
    }
    await desmarcarPideAgente(conversacion.id);
    notificarClasificacionLeadSiAplica(req.user.empresaId, conversacion);
    return res.status(201).json({ ok: true, mensaje, enviadoWhatsApp: true, tipo: 'audio' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function enviarImagenConversacion(req, res) {
  try {
    if (!req.file?.filename) return res.status(400).json({ message: 'imagen es requerida' });
    const conversacion = await getById(req.user.empresaId, req.params.id);
    if (!conversacion) return res.status(404).json({ message: 'Conversación no encontrada' });
    let telefono = conversacion.contacto_telefono;
    if (!telefono && conversacion.contacto_id) {
      const contacto = await contactoModel.getById(req.user.empresaId, conversacion.contacto_id);
      telefono = contacto?.telefono;
    }
    if (!telefono) return res.status(400).json({ message: 'No hay teléfono del contacto' });

    const rutaPublica = `/api/uploads/conversaciones/${req.file.filename}`;
    const publicUrl = resolvePublicMediaUrl(rutaPublica);
    if (!publicUrl) {
      return res.status(400).json({
        message:
          'El servidor no tiene PUBLIC_APP_URL o PUBLIC_API_URL configurada. Sin una URL pública HTTPS, WhatsApp no puede descargar la imagen.',
      });
    }
    const caption = (req.body?.caption && String(req.body.caption).trim()) ? String(req.body.caption).trim().slice(0, 1024) : '';
    const sent = await enviarImagenEmpresa(req.user.empresaId, telefono, publicUrl, caption);
    if (!sent.ok) {
      return res.status(400).json({ message: sent.error || 'No se pudo enviar la imagen por WhatsApp' });
    }

    const preview = caption || '[imagen enviada]';
    const mensaje = await crear(req.user.empresaId, conversacion.id, {
      origen: 'agente',
      usuarioId: req.user.id,
      contenido: preview,
      esEntrada: false,
      message_type: 'image',
      media_url: rutaPublica,
    });
    await actualizarUltimoMensaje(conversacion.id);
    if (conversacion.contacto_id) {
      try {
        await contactoModel.actualizarUltimoMensajeContacto(req.user.empresaId, conversacion.contacto_id, {
          lastMessage: preview,
          lastMessageAt: new Date(),
        });
      } catch (e) {}
      try {
        await conversationStateModel.setMotorState(req.user.empresaId, conversacion.contacto_id, {
          estado_operativo: 'asesor_activo',
          intencion_actual: 'humano',
          paso_actual: 'asesor_envio_imagen',
          bloqueo_bot: true,
          updated_by: 'agente_crm_imagen',
        });
      } catch (e) {}
    }
    await desmarcarPideAgente(conversacion.id);
    notificarClasificacionLeadSiAplica(req.user.empresaId, conversacion);
    return res.status(201).json({ ok: true, mensaje, enviadoWhatsApp: true, tipo: 'image' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function enviarDocumentoConversacion(req, res) {
  try {
    if (!req.file?.filename) return res.status(400).json({ message: 'documento es requerido' });
    const conversacion = await getById(req.user.empresaId, req.params.id);
    if (!conversacion) return res.status(404).json({ message: 'Conversación no encontrada' });
    let telefono = conversacion.contacto_telefono;
    if (!telefono && conversacion.contacto_id) {
      const contacto = await contactoModel.getById(req.user.empresaId, conversacion.contacto_id);
      telefono = contacto?.telefono;
    }
    if (!telefono) return res.status(400).json({ message: 'No hay teléfono del contacto' });

    const rutaPublica = `/api/uploads/conversaciones/${req.file.filename}`;
    const publicUrl = resolvePublicMediaUrl(rutaPublica);
    if (!publicUrl) {
      return res.status(400).json({
        message:
          'El servidor no tiene PUBLIC_APP_URL o PUBLIC_API_URL configurada. Sin URL pública HTTPS, WhatsApp no puede descargar el archivo.',
      });
    }
    const nombreArchivo = path.basename(req.file.originalname || 'documento').replace(/[^\w.\-()\s\u00C0-\u024F]/gi, '_').slice(0, 200) || 'documento';
    const sent = await enviarDocumentoEmpresa(req.user.empresaId, telefono, publicUrl, nombreArchivo);
    if (!sent.ok) {
      return res.status(400).json({ message: sent.error || 'No se pudo enviar el documento por WhatsApp' });
    }

    const preview = `[archivo: ${nombreArchivo}]`;
    const mensaje = await crear(req.user.empresaId, conversacion.id, {
      origen: 'agente',
      usuarioId: req.user.id,
      contenido: preview,
      esEntrada: false,
      message_type: 'document',
      media_url: rutaPublica,
    });
    await actualizarUltimoMensaje(conversacion.id);
    if (conversacion.contacto_id) {
      try {
        await contactoModel.actualizarUltimoMensajeContacto(req.user.empresaId, conversacion.contacto_id, {
          lastMessage: preview,
          lastMessageAt: new Date(),
        });
      } catch (e) {}
      try {
        await conversationStateModel.setMotorState(req.user.empresaId, conversacion.contacto_id, {
          estado_operativo: 'asesor_activo',
          intencion_actual: 'humano',
          paso_actual: 'asesor_envio_documento',
          bloqueo_bot: true,
          updated_by: 'agente_crm_documento',
        });
      } catch (e) {}
    }
    await desmarcarPideAgente(conversacion.id);
    notificarClasificacionLeadSiAplica(req.user.empresaId, conversacion);
    return res.status(201).json({ ok: true, mensaje, enviadoWhatsApp: true, tipo: 'document' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function enviarProductoCatalogoConversacion(req, res) {
  try {
    const productoId = req.body?.producto_id ?? req.body?.productoId;
    if (!productoId) return res.status(400).json({ message: 'producto_id es requerido' });
    const conversacion = await getById(req.user.empresaId, req.params.id);
    if (!conversacion) return res.status(404).json({ message: 'Conversación no encontrada' });
    let telefono = conversacion.contacto_telefono;
    if (!telefono && conversacion.contacto_id) {
      const contacto = await contactoModel.getById(req.user.empresaId, conversacion.contacto_id);
      telefono = contacto?.telefono;
    }
    if (!telefono) return res.status(400).json({ message: 'No hay teléfono del contacto' });

    const producto = await productoModel.obtener(req.user.empresaId, productoId);
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });

    const precioTxt = `${Number(producto.precio || 0).toLocaleString('es-CO')} ${producto.moneda || 'COP'}`;
    const nombreProd = (producto.nombre || 'Producto').trim();
    const shortCaption = `${nombreProd} – ${precioTxt}`.slice(0, 1020);
    const descLarga =
      producto.descripcion && String(producto.descripcion).trim()
        ? String(producto.descripcion).trim().slice(0, 4000)
        : '';
    const contenidoHistorial = descLarga ? `${shortCaption}\n${descLarga}` : shortCaption;

    const mediaPathRelativo = () => {
      const raw = String(producto.imagen_url || '').trim();
      if (!raw) return null;
      if (raw.startsWith('http')) return raw;
      return raw.startsWith('/') ? raw : `/${raw}`;
    };

    const tieneImagen = producto.imagen_url && String(producto.imagen_url).trim();
    let tipoMsg = 'text';
    let mediaPath = null;
    let advertencia = null;

    if (tieneImagen) {
      const publicUrl = resolvePublicMediaUrl(producto.imagen_url);
      if (!publicUrl) {
        return res.status(400).json({
          message:
            'No se pudo construir la URL pública de la imagen del producto. Configura PUBLIC_APP_URL o PUBLIC_API_URL en el servidor.',
        });
      }

      const chk = await verificarUrlImagenPublica(publicUrl);
      if (!chk.ok) {
        const sentTxt = await enviarMensajeEmpresa(req.user.empresaId, telefono, contenidoHistorial.slice(0, 4096));
        if (!sentTxt.ok) {
          return res.status(400).json({
            message: `WhatsApp no puede usar la imagen (${chk.error}). Intentamos enviar solo texto y falló: ${sentTxt.error}`,
          });
        }
        const mensaje = await crear(req.user.empresaId, conversacion.id, {
          origen: 'agente',
          usuarioId: req.user.id,
          contenido: contenidoHistorial,
          esEntrada: false,
          message_type: 'text',
          media_url: null,
        });
        await actualizarUltimoMensaje(conversacion.id);
        if (conversacion.contacto_id) {
          try {
            await contactoModel.actualizarUltimoMensajeContacto(req.user.empresaId, conversacion.contacto_id, {
              lastMessage: contenidoHistorial.slice(0, 200),
              lastMessageAt: new Date(),
            });
          } catch (e) {}
          try {
            await conversationStateModel.setMotorState(req.user.empresaId, conversacion.contacto_id, {
              estado_operativo: 'asesor_activo',
              intencion_actual: 'humano',
              paso_actual: 'asesor_envio_catalogo',
              bloqueo_bot: true,
              updated_by: 'agente_crm_catalogo',
            });
          } catch (e) {}
        }
        await desmarcarPideAgente(conversacion.id);
        notificarClasificacionLeadSiAplica(req.user.empresaId, conversacion);
        return res.status(201).json({
          ok: true,
          mensaje,
          enviadoWhatsApp: true,
          tipo: 'text',
          advertencia: `La imagen no es accesible desde internet (${chk.error}). Se envió solo el texto. Revisa HTTPS, PUBLIC_APP_URL y que nginx sirva /api/uploads sin bloqueos.`,
        });
      }

      const sentImg = await enviarImagenEmpresa(req.user.empresaId, telefono, publicUrl, shortCaption);
      if (!sentImg.ok) {
        return res.status(400).json({ message: sentImg.error || 'No se pudo enviar la imagen por WhatsApp' });
      }

      if (descLarga) {
        const sentTxt = await enviarMensajeEmpresa(req.user.empresaId, telefono, descLarga);
        if (!sentTxt.ok) {
          advertencia = `La foto se envió; el texto largo no llegó: ${sentTxt.error}`;
        }
      }

      tipoMsg = 'image';
      mediaPath = mediaPathRelativo();
    } else {
      const sent = await enviarMensajeEmpresa(req.user.empresaId, telefono, contenidoHistorial.slice(0, 4096));
      if (!sent.ok) {
        return res.status(400).json({ message: sent.error || 'No se pudo enviar por WhatsApp' });
      }
    }

    const mensaje = await crear(req.user.empresaId, conversacion.id, {
      origen: 'agente',
      usuarioId: req.user.id,
      contenido: contenidoHistorial,
      esEntrada: false,
      message_type: tipoMsg,
      media_url: mediaPath,
    });
    await actualizarUltimoMensaje(conversacion.id);
    if (conversacion.contacto_id) {
      try {
        await contactoModel.actualizarUltimoMensajeContacto(req.user.empresaId, conversacion.contacto_id, {
          lastMessage: contenidoHistorial.slice(0, 200),
          lastMessageAt: new Date(),
        });
      } catch (e) {}
      try {
        await conversationStateModel.setMotorState(req.user.empresaId, conversacion.contacto_id, {
          estado_operativo: 'asesor_activo',
          intencion_actual: 'humano',
          paso_actual: 'asesor_envio_catalogo',
          bloqueo_bot: true,
          updated_by: 'agente_crm_catalogo',
        });
      } catch (e) {}
    }
    await desmarcarPideAgente(conversacion.id);
    notificarClasificacionLeadSiAplica(req.user.empresaId, conversacion);
    return res.status(201).json({
      ok: true,
      mensaje,
      enviadoWhatsApp: true,
      tipo: tipoMsg,
      ...(advertencia ? { advertencia } : {}),
    });
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
  enviarAudioConversacion,
  enviarImagenConversacion,
  enviarDocumentoConversacion,
  enviarProductoCatalogoConversacion,
  obtenerMotorConversacion,
  actualizarMotorConversacion,
};
