const path = require('path');
const { listar, getById, actualizar, actualizarUltimoMensaje, marcarPideAgente, desmarcarPideAgente, countPideAgente } = require('../models/conversacionModel');
const { listarPorConversacion, crear } = require('../models/mensajeModel');
const conversationStateModel = require('../models/conversationStateModel');
const {
  enviarMensajeEmpresa,
  enviarAudioTtsEmpresa,
  enviarAudioArchivoEmpresa,
  enviarImagenEmpresa,
  enviarVideoEmpresa,
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

function normalizarMediaProducto(producto, modo = 'all') {
  const media = Array.isArray(producto?.media) && producto.media.length
    ? producto.media
    : (producto?.imagen_url ? [{ type: 'image', url: producto.imagen_url, is_primary: true, order_index: 0 }] : []);
  const clean = media
    .filter((m) => m?.url && ['image', 'video'].includes(String(m.type || '').toLowerCase()))
    .map((m, idx) => ({
      type: String(m.type).toLowerCase(),
      url: String(m.url).trim(),
      is_primary: !!m.is_primary,
      order_index: Number(m.order_index ?? m.order) || idx,
    }))
    .sort((a, b) => a.order_index - b.order_index);
  const filtered = modo === 'images'
    ? clean.filter((m) => m.type === 'image')
    : modo === 'videos'
      ? clean.filter((m) => m.type === 'video')
      : clean;
  const primaryImage = filtered.find((m) => m.type === 'image' && m.is_primary) || filtered.find((m) => m.type === 'image');
  const videos = filtered.filter((m) => m.type === 'video');
  const secondaryImages = filtered.filter((m) => m.type === 'image' && m !== primaryImage);
  return [primaryImage, ...videos, ...secondaryImages].filter(Boolean);
}

async function enviarMediaItemProducto(empresaId, telefono, item, caption) {
  const publicUrl = resolvePublicMediaUrl(item.url);
  if (!publicUrl) return { ok: false, error: 'No se pudo construir URL publica del archivo' };
  if (item.type === 'video') return enviarVideoEmpresa(empresaId, telefono, publicUrl, caption);
  return enviarImagenEmpresa(empresaId, telefono, publicUrl, caption);
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

    const mediaModeRaw = String(req.body?.media_mode || req.body?.mediaMode || 'all').trim().toLowerCase();
    const mediaMode = ['images', 'videos', 'all'].includes(mediaModeRaw) ? mediaModeRaw : 'all';
    const mediaOrdenada = normalizarMediaProducto(producto, mediaMode);
    const enviados = [];
    let advertenciaNueva = null;
    for (let i = 0; i < mediaOrdenada.length; i += 1) {
      const item = mediaOrdenada[i];
      if (item.type === 'image') {
        const publicUrl = resolvePublicMediaUrl(item.url);
        const chk = publicUrl ? await verificarUrlImagenPublica(publicUrl) : { ok: false, error: 'URL publica no disponible' };
        if (!chk.ok) {
          advertenciaNueva = `Un archivo no es accesible desde internet (${chk.error}). Se omitio y se continuo con el paquete.`;
          continue;
        }
      }
      const sent = await enviarMediaItemProducto(req.user.empresaId, telefono, item, i === 0 ? shortCaption : '');
      if (!sent.ok) {
        if (enviados.length === 0) return res.status(400).json({ message: sent.error || 'No se pudo enviar multimedia por WhatsApp' });
        advertenciaNueva = `Algunos archivos no se enviaron: ${sent.error || 'error desconocido'}`;
        continue;
      }
      enviados.push(item);
      await new Promise((r) => setTimeout(r, 600));
    }

    if (descLarga || enviados.length === 0) {
      const sentTxt = await enviarMensajeEmpresa(req.user.empresaId, telefono, (enviados.length ? descLarga : contenidoHistorial).slice(0, 4096));
      if (!sentTxt.ok && enviados.length === 0) {
        return res.status(400).json({ message: sentTxt.error || 'No se pudo enviar por WhatsApp' });
      }
      if (!sentTxt.ok) advertenciaNueva = `La multimedia se envio; el texto largo no llego: ${sentTxt.error}`;
    }

    const primerMedia = enviados[0] || null;
    const mensajeNuevo = await crear(req.user.empresaId, conversacion.id, {
      origen: 'agente',
      usuarioId: req.user.id,
      contenido: contenidoHistorial,
      esEntrada: false,
      message_type: primerMedia ? (enviados.some((m) => m.type === 'video') ? 'video' : 'image') : 'text',
      media_url: primerMedia ? (primerMedia.url.startsWith('http') || primerMedia.url.startsWith('/') ? primerMedia.url : `/${primerMedia.url}`) : null,
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
      mensaje: mensajeNuevo,
      enviadoWhatsApp: true,
      tipo: primerMedia ? (enviados.some((m) => m.type === 'video') ? 'video' : 'image') : 'text',
      mediaEnviada: enviados,
      ...(advertenciaNueva ? { advertencia: advertenciaNueva } : {}),
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
