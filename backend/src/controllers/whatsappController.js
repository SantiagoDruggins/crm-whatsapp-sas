const axios = require('axios');
const config = require('../config/env');
const { getWhatsappConfig, updateWhatsappConfig, getEmpresaByWhatsappPhoneNumberId, obtenerEmpresaPorId } = require('../models/empresaModel');
const contactoModel = require('../models/contactoModel');
const conversacionModel = require('../models/conversacionModel');
const mensajeModel = require('../models/mensajeModel');
const appointmentModel = require('../models/appointmentModel');
const { generarRespuestaBot } = require('./iaController');
const { getAiConfig, transcribeAudioGemini } = require('../services/aiProviderService');

const CLOUD_API_BASE = (config.whatsapp && config.whatsapp.cloudApiBaseUrl) ? config.whatsapp.cloudApiBaseUrl.replace(/\/$/, '') : 'https://graph.facebook.com/v19.0';

/** Sugiere lead_status según el contenido del mensaje (para actualización automática). */
function sugerirLeadStatusDesdeTexto(contenido) {
  if (!contenido || typeof contenido !== 'string') return null;
  const t = contenido.trim().toLowerCase();
  if (/\b(agendo|agendar|agendamos|cita|reservar|reserva)\b/.test(t)) return 'scheduled';
  if (/\b(compré|comprado|ya compré|adquirí)\b/.test(t)) return 'buyer';
  if (/\b(quiero comprar|comprar|me interesa|interesado|tomar el servicio)\b/.test(t)) return 'interested';
  return null;
}

/** Parsea respuesta del bot en busca de CITA:YYYY-MM-DD|HH:MM|notas; crea la cita y devuelve el mensaje sin esa línea. */
async function extraerYCrearCitaSiHay(empresaId, contactId, respuesta) {
  if (!respuesta || typeof respuesta !== 'string') return respuesta;
  const regex = /CITA:(\d{4}-\d{2}-\d{2})\|(\d{1,2}:\d{2})\|([^\n]*)/i;
  const match = respuesta.match(regex);
  if (!match) return respuesta;
  const [, date, time, notes] = match;
  try {
    await appointmentModel.crear(empresaId, {
      contact_id: contactId,
      date,
      time: time.length === 4 ? '0' + time : time,
      status: 'programada',
      notes: (notes || '').trim() || null,
    });
    await contactoModel.actualizar(empresaId, contactId, { lead_status: 'scheduled' });
  } catch (e) {
    console.warn('[WhatsApp] No se pudo crear cita desde bot:', e.message);
  }
  return respuesta.replace(regex, '').replace(/\n{2,}/g, '\n').trim();
}

/** Obtiene la URL del medio de WhatsApp y descarga el contenido (para audios). */
async function descargarMediaWhatsApp(mediaId, accessToken) {
  const urlMeta = `${CLOUD_API_BASE}/${mediaId}`;
  const resMeta = await axios.get(urlMeta, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 10000,
  });
  const mediaUrl = resMeta.data?.url;
  if (!mediaUrl) return { buffer: null, error: 'No URL en respuesta de media' };
  const resFile = await axios.get(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    responseType: 'arraybuffer',
    timeout: 15000,
  });
  return { buffer: Buffer.from(resFile.data), error: null };
}

async function cloudWebhookGet(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const wa = config.whatsapp || {};
  if (mode === 'subscribe' && token === wa.cloudVerifyToken && challenge) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Forbidden');
}

/** Envía un mensaje de texto por WhatsApp Cloud API usando la config de la empresa. */
async function enviarMensajeEmpresa(empresaId, toPhone, text) {
  const row = await getWhatsappConfig(empresaId);
  if (!row?.whatsapp_cloud_access_token || !row?.whatsapp_cloud_phone_number_id) return { ok: false, error: 'WhatsApp no configurado' };
  const url = `${CLOUD_API_BASE}/${row.whatsapp_cloud_phone_number_id}/messages`;
  const toNumber = String(toPhone).replace(/\D/g, '');
  try {
    await axios.post(
      url,
      { messaging_product: 'whatsapp', to: toNumber, type: 'text', text: { body: text } },
      { headers: { Authorization: `Bearer ${row.whatsapp_cloud_access_token}`, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.response?.data?.error?.message || err.message };
  }
}

async function cloudWebhookPost(req, res) {
  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account' || !body.entry) return res.status(200).send('ok');

    for (const entry of body.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        const empresa = phoneNumberId ? await getEmpresaByWhatsappPhoneNumberId(phoneNumberId) : null;
        if (!empresa?.id) continue;

        if (value?.messages) {
          for (const msg of value.messages) {
            const from = msg.from;
            const type = msg.type;
            let text = type === 'text' ? (msg.text?.body || '') : type === 'button' ? (msg.button?.text || '') : '';

            // Mensajes de audio: descargar y transcribir con IA para que el bot responda
            if ((type === 'audio' || type === 'voice') && msg.audio?.id) {
              try {
                const waConfig = await getWhatsappConfig(empresa.id);
                const token = waConfig?.whatsapp_cloud_access_token;
                if (token) {
                  const { buffer, error: errMedia } = await descargarMediaWhatsApp(msg.audio.id, token);
                  if (buffer && buffer.length > 0) {
                    const empresaFull = await obtenerEmpresaPorId(empresa.id);
                    const aiConfig = getAiConfig(empresaFull, config);
                    if (aiConfig?.apiKey) {
                      const mime = msg.audio?.mime_type || 'audio/ogg';
                      const b64 = buffer.toString('base64');
                      const { text: transcribed, error: errTrans } = await transcribeAudioGemini(aiConfig.apiKey, b64, mime);
                      if (transcribed && transcribed.trim()) text = transcribed.trim();
                      else if (errTrans) console.warn('[WhatsApp] Transcripción audio:', errTrans);
                    }
                  } else if (errMedia) console.warn('[WhatsApp] Descarga audio:', errMedia);
                }
              } catch (errAudio) {
                console.error('[WhatsApp] Error procesando audio:', errAudio.message);
              }
              if (!text) text = '[audio no transcrito]';
            }

            const contacto = await contactoModel.getOrCreateByTelefono(empresa.id, from);
            const conversacion = await conversacionModel.getOrCreate(empresa.id, contacto.id, 'whatsapp');
            const contenidoEntrada = text || '[mensaje no texto]';
            await mensajeModel.crear(empresa.id, conversacion.id, { origen: 'cliente', contenido: contenidoEntrada, esEntrada: true });
            await conversacionModel.actualizarUltimoMensaje(conversacion.id);
            await contactoModel.actualizarUltimoMensajeContacto(empresa.id, contacto.id, { lastMessage: contenidoEntrada, lastMessageAt: new Date() });

            // Actualización automática de lead_status según palabras clave del mensaje
            const sugerido = sugerirLeadStatusDesdeTexto(contenidoEntrada);
            if (sugerido) {
              try {
                await contactoModel.actualizar(empresa.id, contacto.id, { lead_status: sugerido });
              } catch (e) {
                // ignorar si la columna no existe o falla
              }
            }

            if (text && text.trim()) {
              let respuestaEnviada = null;
              try {
                const { respuesta, error } = await generarRespuestaBot(empresa.id, text.trim(), { contactId: contacto.id, conversacionId: conversacion.id });
                if (respuesta && respuesta.trim()) {
                  const respuestaLimpia = await extraerYCrearCitaSiHay(empresa.id, contacto.id, respuesta.trim());
                  const textoEnviar = respuestaLimpia || respuesta.trim();
                  const sent = await enviarMensajeEmpresa(empresa.id, from, textoEnviar);
                  if (sent.ok) {
                    await mensajeModel.crear(empresa.id, conversacion.id, { origen: 'bot', contenido: textoEnviar, esEntrada: false });
                    await conversacionModel.actualizarUltimoMensaje(conversacion.id);
                    await contactoModel.actualizarUltimoMensajeContacto(empresa.id, contacto.id, { lastMessage: textoEnviar, lastMessageAt: new Date() });
                    respuestaEnviada = true;
                  }
                } else {
                  console.warn('[WhatsApp] Bot sin respuesta para', from, 'error:', error || 'sin texto');
                  const fallback = 'Disculpa, en este momento no pude procesar tu mensaje. ¿Puedes intentar de nuevo en un momento?';
                  const sent = await enviarMensajeEmpresa(empresa.id, from, fallback);
                  if (sent.ok) {
                    await mensajeModel.crear(empresa.id, conversacion.id, { origen: 'bot', contenido: fallback, esEntrada: false });
                    await conversacionModel.actualizarUltimoMensaje(conversacion.id);
                    await contactoModel.actualizarUltimoMensajeContacto(empresa.id, contacto.id, { lastMessage: fallback, lastMessageAt: new Date() });
                  }
                }
              } catch (err) {
                console.error('[WhatsApp] Error al generar/enviar respuesta:', err.message);
                const fallback = 'Disculpa, hubo un momento de demora. ¿Puedes escribirme de nuevo?';
                try {
                  await enviarMensajeEmpresa(empresa.id, from, fallback);
                  await mensajeModel.crear(empresa.id, conversacion.id, { origen: 'bot', contenido: fallback, esEntrada: false });
                  await conversacionModel.actualizarUltimoMensaje(conversacion.id);
                } catch (e2) {
                  console.error('[WhatsApp] No se pudo enviar fallback:', e2.message);
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('cloudWebhookPost:', err);
  }
  return res.status(200).send('ok');
}

function esPlaceholderToken(val) {
  if (!val || typeof val !== 'string') return true;
  const v = val.trim().toLowerCase();
  return v.length < 20 || v.startsWith('tu_') || v.startsWith('id_del_') || v.startsWith('your_') || v === 'tu_access_token' || v === 'tu_verify_token';
}

function esPlaceholderPhoneId(val) {
  if (!val || typeof val !== 'string') return true;
  const v = val.trim().toLowerCase();
  return v.startsWith('tu_') || v.startsWith('id_del_') || v.startsWith('your_') || v === 'id_del_numero' || /^id_del_numero/.test(v);
}

function isCloudConfigurado(wa) {
  const token = wa.cloudAccessToken ?? wa.whatsapp_cloud_access_token;
  const phoneId = wa.cloudPhoneNumberId ?? wa.whatsapp_cloud_phone_number_id;
  return !!(token && !esPlaceholderToken(token) && phoneId && !esPlaceholderPhoneId(phoneId));
}

async function cloudStatus(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const row = await getWhatsappConfig(empresaId);
    const configurado = isCloudConfigurado(row || {});
    return res.status(200).json({ ok: true, configurado });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function cloudConfigUpdate(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const { accessToken, phoneNumberId } = req.body;
    await updateWhatsappConfig(empresaId, {
      accessToken: accessToken !== undefined ? String(accessToken).trim() : undefined,
      phoneNumberId: phoneNumberId !== undefined ? String(phoneNumberId).trim() : undefined,
    });
    const row = await getWhatsappConfig(empresaId);
    const configurado = isCloudConfigurado(row || {});
    return res.status(200).json({ ok: true, configurado, message: 'Credenciales guardadas' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error al guardar' });
  }
}

async function cloudSend(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const { to, text } = req.body;
    if (!to || !text) return res.status(400).json({ message: 'to y text son requeridos' });

    const row = await getWhatsappConfig(empresaId);
    if (!isCloudConfigurado(row || {})) {
      return res.status(400).json({
        message: 'Configura tu Access Token y Phone Number ID de Meta en esta página.',
      });
    }

    const token = row.whatsapp_cloud_access_token;
    const phoneNumberId = row.whatsapp_cloud_phone_number_id;
    const toNumber = String(to).replace(/\D/g, '');
    const url = `${CLOUD_API_BASE}/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: toNumber,
      type: 'text',
      text: { body: text },
    };

    const { data } = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return res.status(200).json({ ok: true, message: 'Mensaje enviado', cloudMessageId: data?.messages?.[0]?.id });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error('cloudSend:', err.response?.data || err);
    return res.status(err.response?.status || 500).json({ message: msg || 'Error al enviar por WhatsApp Cloud API' });
  }
}

function cloudWebhookConfig(req, res) {
  const base = (config.whatsapp && config.whatsapp.publicWebhookBaseUrl) ? config.whatsapp.publicWebhookBaseUrl : '';
  const webhookUrl = base ? `${base}/api/whatsapp/webhook` : '';
  const verifyToken = (config.whatsapp && config.whatsapp.cloudVerifyToken) ? config.whatsapp.cloudVerifyToken : '';
  return res.json({ webhookUrl, verifyToken });
}

module.exports = {
  cloudWebhookGet,
  cloudWebhookPost,
  cloudWebhookConfig,
  cloudStatus,
  cloudConfigUpdate,
  cloudSend,
  isCloudConfigurado,
};
