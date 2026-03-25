const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const { getWhatsappConfig, updateWhatsappConfig, getEmpresaByWhatsappPhoneNumberId, obtenerEmpresaPorId } = require('../models/empresaModel');
const contactoModel = require('../models/contactoModel');
const conversacionModel = require('../models/conversacionModel');
const mensajeModel = require('../models/mensajeModel');
const pedidoModel = require('../models/pedidoModel');
const appointmentModel = require('../models/appointmentModel');
const productoModel = require('../models/productoModel');
const planModel = require('../models/planModel');
const flowModel = require('../models/flowModel');
const { generarRespuestaBot } = require('./iaController');
const { getAiConfig, generateContent, transcribeAudioGemini, textoAVozGemini } = require('../services/aiProviderService');

const CLOUD_API_BASE = (config.whatsapp && config.whatsapp.cloudApiBaseUrl) ? config.whatsapp.cloudApiBaseUrl.replace(/\/$/, '') : 'https://graph.facebook.com/v19.0';
const FB_GRAPH = 'https://graph.facebook.com/v19.0';

// Evita spam de Graph API si el usuario refresca la pantalla repetidamente.
const phoneResolveAttemptAt = new Map(); // empresaId -> timestamp(ms)

/** IDs de mensajes ya procesados (evita doble respuesta por reintentos del webhook o ecos). */
const processedMessageIds = new Set();
const MAX_PROCESSED_IDS = 10000;

/** Sugiere lead_status según el contenido del mensaje (para actualización automática). */
function sugerirLeadStatusDesdeTexto(contenido) {
  if (!contenido || typeof contenido !== 'string') return null;
  const t = contenido.trim().toLowerCase();
  if (/\b(agendo|agendar|agendamos|cita|reservar|reserva)\b/.test(t)) return 'scheduled';
  if (/\b(compré|comprado|ya compré|adquirí)\b/.test(t)) return 'buyer';
  if (/\b(quiero comprar|comprar|me interesa|interesado|tomar el servicio)\b/.test(t)) return 'interested';
  return null;
}

function normalizeText(s) {
  return (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pareceConfirmacionCompra(texto) {
  const t = normalizeText(texto);
  if (!t) return false;
  return (
    /\b(confirmo|confirmar|listo|de una|hagale|hágale|lo quiero|la quiero|quiero ese|quiero ese producto|me lo llevo|comprar ya|si lo compro|si compro|ok lo compro|ok compro|dale|dale compra)\b/.test(t) ||
    (/\bquiero\b/.test(t) && /\bcomprar|pedido|orden\b/.test(t))
  );
}

function matchProductoPorNombre(texto, productos) {
  const t = normalizeText(texto);
  if (!t || !Array.isArray(productos) || productos.length === 0) return null;
  let best = null;
  let bestScore = 0;
  for (const p of productos) {
    const nombre = normalizeText(p?.nombre);
    if (!nombre) continue;
    if (nombre.length >= 4 && t.includes(nombre)) {
      const score = Math.min(1000, nombre.length);
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
      continue;
    }
    const words = nombre.split(' ').filter((w) => w.length >= 4);
    if (words.length) {
      const hits = words.filter((w) => t.includes(w)).length;
      if (hits > 0) {
        const score = hits * 10 + nombre.length;
        if (score > bestScore) {
          best = p;
          bestScore = score;
        }
      }
    }
  }
  return best;
}

async function tryCrearPedidoDesdeWhatsapp({ empresaId, contacto, conversacion, fromPhone, texto }) {
  if (!empresaId || !conversacion?.id || !contacto?.id) return { ok: false };
  if (!pareceConfirmacionCompra(texto)) return { ok: false };
  const productos = await productoModel.listarActivos(empresaId, { limit: 200, offset: 0 });
  const producto = matchProductoPorNombre(texto, productos);
  if (!producto?.id) return { ok: false };

  // Evitar duplicados recientes (misma conversación + mismo producto)
  const reciente = await pedidoModel.getRecientePorConversacionProducto(empresaId, conversacion.id, producto.id, { minutos: 15 });
  if (reciente?.id) return { ok: true, yaExistia: true, pedidoId: reciente.id, producto };

  const precio = Number(producto.precio) || 0;
  const moneda = producto.moneda || 'COP';
  const datos = {
    origen: 'whatsapp_auto',
    producto_id: String(producto.id),
    producto_nombre: producto.nombre || '',
    tipo: producto.tipo || 'producto',
    cantidad: 1,
    precio_unitario: precio,
    moneda,
    items: [
      {
        producto_id: String(producto.id),
        nombre: producto.nombre || '',
        cantidad: 1,
        precio_unitario: precio,
        moneda,
      },
    ],
    telefono: String(fromPhone || '').replace(/\D/g, ''),
  };

  const pedido = await pedidoModel.crear(empresaId, {
    contacto_id: contacto.id,
    conversacion_id: conversacion.id,
    estado: 'pendiente',
    total: precio,
    datos,
    direccion: {},
  });

  return { ok: true, pedido, producto };
}

/** Indica si el mensaje del cliente pide hablar con una persona/agente real (para avisar en el CRM). */
function clientePideAgenteHumano(contenido) {
  if (!contenido || typeof contenido !== 'string') return false;
  const t = contenido.trim().toLowerCase();
  const frases = [
    /\b(quiero|necesito|deseo|puedo)\s+(hablar|escribir|comunicarme)\s+con\s+(un\s+)?(humano|agente|persona|asesor|operador|alguien)\b/,
    /\b(hablar|escribir|atender)\s+con\s+(un\s+)?(humano|agente|persona|asesor|operador)\b/,
    /\b(no\s+quiero\s+)?(robot|bot|ia|inteligencia\s+artificial)\b.*\b(quiero\s+)?(persona|humano|agente)\b/,
    /\bpersona\s+real\b/,
    /\b(agente|operador|asesor)\s+humano\b/,
    /\b(ponme|pásame|pásenme|conecten)\s+(con\s+)?(un\s+)?(agente|operador|persona)\b/,
    /\b(atención\s+)?(humana|personal)\b/,
    /\b(contactar|hablar)\s+con\s+(alguien|alguien\s+de)\b/,
  ];
  return frases.some((r) => r.test(t));
}

/** Parsea [IMAGEN: path] y [AUDIO: url] en la respuesta; devuelve { textoLimpio, urlsImagen, urlsAudio }. */
function extraerImagenesYAudiosDeRespuesta(respuesta, baseUrl) {
  if (!respuesta || typeof respuesta !== 'string') return { textoLimpio: respuesta, urlsImagen: [], urlsAudio: [] };
  const urlsImagen = [];
  const urlsAudio = [];
  let textoLimpio = respuesta;
  const reImagen = /\[?IMAGEN:\s*([^\]\n]+)\]?/gi;
  let m;
  while ((m = reImagen.exec(respuesta)) !== null) {
    const path = (m[1] || '').trim();
    if (path) {
      const url = path.startsWith('http') ? path : `${(baseUrl || '').replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
      if (url.startsWith('http')) urlsImagen.push(url);
    }
  }
  const reAudio = /\[?AUDIO:\s*([^\]\n]+)\]?/gi;
  while ((m = reAudio.exec(respuesta)) !== null) {
    const path = (m[1] || '').trim();
    if (path) {
      const url = path.startsWith('http') ? path : `${(baseUrl || '').replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
      if (url.startsWith('http')) urlsAudio.push(url);
    }
  }
  textoLimpio = respuesta.replace(/\s*\[?IMAGEN:\s*[^\]\n]+\]?\s*/gi, '\n').replace(/\s*\[?AUDIO:\s*[^\]\n]+\]?\s*/gi, '\n').replace(/\n{2,}/g, '\n').trim();
  return { textoLimpio, urlsImagen, urlsAudio };
}

/** Parsea respuesta del bot en busca de CITA:YYYY-MM-DD|HH:MM|notas; crea la cita si el horario está libre y devuelve el mensaje sin esa línea. */
async function extraerYCrearCitaSiHay(empresaId, contactId, respuesta) {
  if (!respuesta || typeof respuesta !== 'string') return respuesta;
  const regex = /CITA:(\d{4}-\d{2}-\d{2})\|(\d{1,2}:\d{2})\|([^\n]*)/i;
  const match = respuesta.match(regex);
  if (!match) return respuesta;
  const [, date, time, notes] = match;
  const timeNorm = time.length === 4 ? '0' + time : time;
  try {
    const ocupado = await appointmentModel.existeCitaEnHorario(empresaId, date, timeNorm);
    if (ocupado) {
      const aviso = '\n\n(Ese horario ya está ocupado con otra cita; no pude agendarla. ¿Me das otro horario?)';
      return respuesta.replace(regex, '').replace(/\n{2,}/g, '\n').trim() + aviso;
    }
    await appointmentModel.crear(empresaId, {
      contact_id: contactId,
      date,
      time: timeNorm,
      status: 'programada',
      notes: (notes || '').trim() || null,
    });
    await contactoModel.actualizar(empresaId, contactId, { lead_status: 'scheduled' });
  } catch (e) {
    console.warn('[WhatsApp] No se pudo crear cita desde bot:', e.message);
  }
  return respuesta.replace(regex, '').replace(/\n{2,}/g, '\n').trim();
}

/**
 * Parsea respuesta del bot en busca de PEDIDO:{json}; crea el pedido y devuelve el mensaje sin esa línea.
 * JSON esperado (mínimo): { "producto_id": "...", "cantidad": 1 }
 */
async function extraerYCrearPedidoSiHay(empresaId, contactId, conversacionId, respuesta) {
  if (!respuesta || typeof respuesta !== 'string') return respuesta;
  const regex = /PEDIDO:\s*(\{[\s\S]*?\})\s*$/im;
  const match = respuesta.match(regex);
  if (!match) return respuesta;
  let payload = null;
  try {
    payload = JSON.parse(match[1]);
  } catch (e) {
    return respuesta.replace(regex, '').replace(/\n{2,}/g, '\n').trim();
  }
  const productoId = payload?.producto_id ? String(payload.producto_id).trim() : '';
  const cantidad = Math.max(1, Number(payload?.cantidad || 1));
  if (!productoId) return respuesta.replace(regex, '').replace(/\n{2,}/g, '\n').trim();
  try {
    const producto = await productoModel.obtener(empresaId, productoId);
    if (!producto) return respuesta.replace(regex, '').replace(/\n{2,}/g, '\n').trim();

    // Evitar duplicados recientes
    const reciente = await pedidoModel.getRecientePorConversacionProducto(empresaId, conversacionId, productoId, { minutos: 15 });
    if (!reciente?.id) {
      const precio = Number(producto.precio) || 0;
      const moneda = producto.moneda || 'COP';
      const total = precio * cantidad;
      const datos = {
        origen: 'whatsapp_ai_struct',
        producto_id: String(producto.id),
        producto_nombre: producto.nombre || '',
        tipo: producto.tipo || 'producto',
        cantidad,
        precio_unitario: precio,
        moneda,
        items: [
          {
            producto_id: String(producto.id),
            nombre: producto.nombre || '',
            cantidad,
            precio_unitario: precio,
            moneda,
          },
        ],
      };
      await pedidoModel.crear(empresaId, {
        contacto_id: contactId,
        conversacion_id: conversacionId,
        estado: 'pendiente',
        total,
        datos,
        direccion: payload?.direccion && typeof payload.direccion === 'object' ? payload.direccion : {},
      });
    }
  } catch (e) {
    console.warn('[WhatsApp] No se pudo crear pedido desde IA:', e.message);
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

/** Envía una imagen por WhatsApp Cloud API (link debe ser URL pública). */
async function enviarImagenEmpresa(empresaId, toPhone, imageUrl, caption) {
  const row = await getWhatsappConfig(empresaId);
  if (!row?.whatsapp_cloud_access_token || !row?.whatsapp_cloud_phone_number_id) return { ok: false, error: 'WhatsApp no configurado' };
  const url = `${CLOUD_API_BASE}/${row.whatsapp_cloud_phone_number_id}/messages`;
  const toNumber = String(toPhone).replace(/\D/g, '');
  const body = {
    messaging_product: 'whatsapp',
    to: toNumber,
    type: 'image',
    image: { link: imageUrl }
  };
  if (caption && String(caption).trim()) body.image.caption = String(caption).trim().slice(0, 1024);
  try {
    await axios.post(url, body, {
      headers: { Authorization: `Bearer ${row.whatsapp_cloud_access_token}`, 'Content-Type': 'application/json' },
      timeout: 15000
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.response?.data?.error?.message || err.message };
  }
}

/** Envía un audio por WhatsApp Cloud API (URL pública o bien subir buffer y enviar por id). Formatos: AAC, AMR, MP4, MPEG, OGG. */
async function enviarAudioEmpresa(empresaId, toPhone, audioUrl) {
  const row = await getWhatsappConfig(empresaId);
  if (!row?.whatsapp_cloud_access_token || !row?.whatsapp_cloud_phone_number_id) return { ok: false, error: 'WhatsApp no configurado' };
  const url = `${CLOUD_API_BASE}/${row.whatsapp_cloud_phone_number_id}/messages`;
  const toNumber = String(toPhone).replace(/\D/g, '');
  try {
    await axios.post(
      url,
      { messaging_product: 'whatsapp', to: toNumber, type: 'audio', audio: { link: audioUrl } },
      { headers: { Authorization: `Bearer ${row.whatsapp_cloud_access_token}`, 'Content-Type': 'application/json' }, timeout: 20000 }
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.response?.data?.error?.message || err.message };
  }
}

/** Sube un buffer de audio a Meta y envía el mensaje de audio por WhatsApp. Para TTS (texto a voz). */
async function subirYEnviarAudioEmpresa(empresaId, toPhone, audioBuffer, mimeType = 'audio/mpeg') {
  const row = await getWhatsappConfig(empresaId);
  if (!row?.whatsapp_cloud_access_token || !row?.whatsapp_cloud_phone_number_id) return { ok: false, error: 'WhatsApp no configurado' };
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', audioBuffer, { filename: 'audio.mp3', contentType: mimeType });
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  const uploadUrl = `${CLOUD_API_BASE}/${row.whatsapp_cloud_phone_number_id}/media`;
  try {
    const up = await axios.post(uploadUrl, form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${row.whatsapp_cloud_access_token}` },
      maxBodyLength: Infinity,
      timeout: 30000
    });
    const mediaId = up.data?.id;
    if (!mediaId) return { ok: false, error: 'No se obtuvo id de media' };
    const msgUrl = `${CLOUD_API_BASE}/${row.whatsapp_cloud_phone_number_id}/messages`;
    await axios.post(
      msgUrl,
      { messaging_product: 'whatsapp', to: String(toPhone).replace(/\D/g, ''), type: 'audio', audio: { id: mediaId } },
      { headers: { Authorization: `Bearer ${row.whatsapp_cloud_access_token}`, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.response?.data?.error?.message || err.message };
  }
}

/** Convierte texto a audio con OpenAI TTS (tts-1). Requiere OPENAI_API_KEY. Máx ~2500 caracteres. */
async function textoAVozOpenAI(texto, apiKey) {
  if (!texto || !apiKey || String(texto).length > 2500) return null;
  try {
    const res = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      { model: 'tts-1', input: String(texto).slice(0, 2500), voice: 'alloy' },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, responseType: 'arraybuffer', timeout: 30000 }
    );
    return res.data && Buffer.isBuffer(res.data) ? res.data : Buffer.from(res.data);
  } catch (e) {
    console.warn('[TTS] OpenAI:', e.response?.data?.error?.message || e.message);
    return null;
  }
}

/** Genera y envía un audio TTS (texto a voz) a un cliente por WhatsApp. */
async function enviarAudioTtsEmpresa(empresaId, toPhone, texto) {
  if (!texto || String(texto).trim().length < 3) return { ok: false, error: 'Texto vacío' };
  const text = String(texto).trim().slice(0, 2500);
  try {
    const empresaFull = await obtenerEmpresaPorId(empresaId);
    const aiConfig = getAiConfig(empresaFull, config);
    const geminiKey = config.gemini?.apiKey || (aiConfig?.provider === 'gemini' ? aiConfig.apiKey : null);
    const ttsModel = config.gemini?.ttsModel || process.env.GEMINI_TTS_MODEL || 'gemini-2.5-pro-preview-tts';

    let audioBuffer = null;
    let audioMime = 'audio/mpeg';
    if (geminiKey) {
      const geminiAudio = await textoAVozGemini(text, geminiKey, ttsModel);
      if (geminiAudio?.buffer) {
        audioBuffer = geminiAudio.buffer;
        audioMime = geminiAudio.mimeType || 'audio/mpeg';
      }
    }
    if (!audioBuffer && config.openai?.apiKey) {
      audioBuffer = await textoAVozOpenAI(text, config.openai.apiKey);
      audioMime = 'audio/mpeg';
    }
    if (!audioBuffer) return { ok: false, error: 'No hay proveedor TTS configurado' };
    const sent = await subirYEnviarAudioEmpresa(empresaId, toPhone, audioBuffer, audioMime);
    return sent?.ok ? { ok: true } : { ok: false, error: sent?.error || 'No se pudo enviar audio' };
  } catch (e) {
    return { ok: false, error: e.message || 'Error TTS' };
  }
}

/**
 * Decide si se debe enviar la respuesta también en audio (TTS). Opcional; no sustituye el envío en texto.
 * @param {string} texto - Texto de la respuesta del bot
 * @param {boolean} [useAudioEnv] - Si BOT_ENVIAR_RESPUESTA_EN_AUDIO está en true
 * @returns {boolean}
 */
function debeUsarAudioParaRespuesta(texto, useAudioEnv) {
  if (useAudioEnv === true) return true;
  if (!texto || typeof texto !== 'string') return false;
  const t = texto.trim().toLowerCase();
  if (t.length < 10 || t.length > 2500) return false;
  if (/\b(cita agendada|agendamos tu cita|te esperamos el|confirmamos tu cita|quedó agendad[oa])\b/.test(t)) return true;
  if (/\b(instalación programada|confirmamos la instalación|instalación confirmada|agendamos la instalación)\b/.test(t)) return true;
  if (/\b(bienvenid[oa]|hola, bienvenid[oa]|gracias por escribir|encantad[oa]s de atenderte)\b/.test(t)) return true;
  return false;
}

/** Indica si el mensaje del usuario parece una consulta por productos/catálogo (para enviar fotos). */
function esConsultaProductos(texto) {
  if (!texto || typeof texto !== 'string') return false;
  const t = texto.trim().toLowerCase();
  return /\b(productos?|catálogo|catalogo|qué tienen|que tienen|qué ofrecen|precios?|mostrar|ver)\b/.test(t) ||
    /\b(tienen foto|imágenes?|imagenes|fotos?|muéstrame|muestrame)\b/.test(t) ||
    /qué\s+(venden|ofrecen|tienen)/i.test(t);
}

function normalizarTagsContacto(contacto) {
  const t = contacto && contacto.tags;
  if (!t && t !== 0) return [];
  if (Array.isArray(t)) return t.map((x) => String(x).trim()).filter(Boolean);
  if (typeof t === 'string') {
    return t
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  if (typeof t === 'object') {
    try {
      const vals = Object.values(t || {});
      return vals.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

async function ejecutarFlujosAutomatizados(empresaId, contacto, mensajeTexto, conversacion, fromPhone) {
  try {
    const texto = (mensajeTexto || '').trim();
    if (!texto) return { handled: false };
    const flows = await flowModel.listarActivosPorEmpresa(empresaId);
    if (!flows || !flows.length) return { handled: false };

    const t = texto.toLowerCase();
    const leadStatus = (contacto.lead_status || '').toString().toLowerCase();
    const tags = normalizarTagsContacto(contacto).map((x) => x.toLowerCase());

    for (const flow of flows) {
      const triggerType = (flow.trigger_type || '').toLowerCase();
      const triggerValue = (flow.trigger_value || '').toLowerCase().trim();
      if (!triggerType || !triggerValue) continue;

      let match = false;
      if (triggerType === 'keyword') {
        if (t.includes(triggerValue)) match = true;
      } else if (triggerType === 'lead_status') {
        if (leadStatus && leadStatus === triggerValue) match = true;
      } else if (triggerType === 'tag') {
        if (tags.includes(triggerValue)) match = true;
      }

      if (!match) continue;

      const accion = (flow.accion_tipo || '').toLowerCase();
      const valor = flow.accion_valor || '';

      if (accion === 'mensaje') {
        const textoRespuesta = String(valor || '').trim();
        if (!textoRespuesta) continue;
        const sent = await enviarMensajeEmpresa(empresaId, fromPhone, textoRespuesta);
        if (sent.ok) {
          await mensajeModel.crear(empresaId, conversacion.id, { origen: 'bot', contenido: textoRespuesta, esEntrada: false });
          await conversacionModel.actualizarUltimoMensaje(conversacion.id);
          if (contacto.id) {
            await contactoModel.actualizarUltimoMensajeContacto(empresaId, contacto.id, { lastMessage: textoRespuesta, lastMessageAt: new Date() });
          }
        }
        return { handled: true };
      }

      if (accion === 'tag') {
        const nuevoTag = String(valor || '').trim();
        if (!nuevoTag || !contacto.id) return { handled: true };
        const actuales = normalizarTagsContacto(contacto);
        const existe = actuales.some((x) => x.toLowerCase() === nuevoTag.toLowerCase());
        if (!existe) {
          actuales.push(nuevoTag);
          try {
            await contactoModel.actualizar(empresaId, contacto.id, { tags: actuales });
          } catch (e) {
            console.warn('[Flows] Error actualizando tags', e.message);
          }
        }
        return { handled: true };
      }

      if (accion === 'cambiar_estado') {
        const nuevoEstado = String(valor || '').trim();
        if (nuevoEstado && contacto.id) {
          try {
            await contactoModel.actualizar(empresaId, contacto.id, { lead_status: nuevoEstado });
          } catch (e) {
            console.warn('[Flows] Error cambiando lead_status', e.message);
          }
        }
        return { handled: true };
      }
    }
    return { handled: false };
  } catch (e) {
    console.warn('[Flows] Error ejecutando flujos', e.message);
    return { handled: false };
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
        const rawPid = value?.metadata?.phone_number_id;
        const phoneNumberId =
          rawPid === undefined || rawPid === null ? null : String(rawPid).replace(/\s+/g, '').trim();
        const empresa = phoneNumberId ? await getEmpresaByWhatsappPhoneNumberId(phoneNumberId) : null;
        if (!empresa?.id) {
          if (phoneNumberId && value?.messages?.length) {
            console.warn(
              '[WhatsApp webhook] Ninguna empresa coincide con phone_number_id de Meta:',
              phoneNumberId,
              '(revisa que en la BD whatsapp_cloud_phone_number_id sea exactamente ese ID de Meta → WhatsApp → Número)'
            );
          }
          continue;
        }

        if (value?.messages) {
          for (const msg of value.messages) {
            const msgId = msg.id;
            if (!msgId) continue;
            if (processedMessageIds.has(msgId)) continue;
            processedMessageIds.add(msgId);
            if (processedMessageIds.size > MAX_PROCESSED_IDS) processedMessageIds.clear();

            const from = msg.from;
            const type = msg.type;
            let text = '';
            if (type === 'text') text = msg.text?.body || '';
            else if (type === 'button') text = msg.button?.text || '';
            else if (type === 'interactive') {
              text =
                msg.interactive?.button_reply?.title ||
                msg.interactive?.list_reply?.title ||
                msg.interactive?.button_reply?.id ||
                '';
            }

            // Mensajes de audio: descargar, guardar archivo para el CRM, transcribir con IA
            let audioMediaUrl = null;
            if ((type === 'audio' || type === 'voice') && msg.audio?.id) {
              try {
                const waConfig = await getWhatsappConfig(empresa.id);
                const token = waConfig?.whatsapp_cloud_access_token;
                if (token) {
                  const { buffer, error: errMedia } = await descargarMediaWhatsApp(msg.audio.id, token);
                  if (buffer && buffer.length > 0) {
                    const mime = msg.audio?.mime_type || 'audio/ogg';
                    const ext = mime.includes('mpeg') || mime.includes('mp3') ? '.mp3' : mime.includes('m4a') || mime.includes('mp4') ? '.m4a' : '.ogg';
                    const dirAudios = path.join(process.cwd(), 'uploads', 'audios', String(empresa.id));
                    fs.mkdirSync(dirAudios, { recursive: true });
                    const filename = `${uuidv4()}${ext}`;
                    const filePath = path.join(dirAudios, filename);
                    fs.writeFileSync(filePath, buffer);
                    audioMediaUrl = `/uploads/audios/${empresa.id}/${filename}`;

                    const empresaFull = await obtenerEmpresaPorId(empresa.id);
                    const aiConfig = getAiConfig(empresaFull, config);
                    if (aiConfig?.apiKey) {
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

            let contacto = await contactoModel.getByTelefono(empresa.id, from);
            if (!contacto) {
              const limits = await planModel.getLimitsForEmpresa(empresa.id);
              if (limits.max_contactos != null) {
                const total = await contactoModel.countByEmpresa(empresa.id);
                if (total >= limits.max_contactos) {
                  await enviarMensajeEmpresa(empresa.id, from, 'Has alcanzado el límite de contactos de tu plan. Actualiza en la web (Pagos) para recibir más conversaciones.');
                  continue;
                }
              }
              contacto = await contactoModel.getOrCreateByTelefono(empresa.id, from);
            }
            const conversacion = await conversacionModel.getOrCreate(empresa.id, contacto.id, 'whatsapp');
            const contenidoEntrada = text || '[mensaje no texto]';
            const payloadMensaje = { origen: 'cliente', contenido: contenidoEntrada, esEntrada: true };
            if (audioMediaUrl) {
              payloadMensaje.message_type = 'audio';
              payloadMensaje.media_url = audioMediaUrl;
            }
            await mensajeModel.crear(empresa.id, conversacion.id, payloadMensaje);
            await conversacionModel.actualizarUltimoMensaje(conversacion.id);
            await contactoModel.actualizarUltimoMensajeContacto(empresa.id, contacto.id, { lastMessage: contenidoEntrada, lastMessageAt: new Date() });

            // Actualización automática de lead_status según palabras clave del mensaje
            const sugerido = sugerirLeadStatusDesdeTexto(contenidoEntrada);
            if (sugerido) {
              try {
                await contactoModel.actualizar(empresa.id, contacto.id, { lead_status: sugerido });
                contacto.lead_status = sugerido;
              } catch (e) {
                // ignorar si la columna no existe o falla
              }
            }

            // Si el cliente pide hablar con una persona/agente real, marcar para avisar en el CRM
            if (clientePideAgenteHumano(contenidoEntrada)) {
              try {
                await conversacionModel.marcarPideAgente(conversacion.id);
              } catch (e) {}
            }

            // Flujos / automatizaciones antes de llamar a la IA
            const resultadoFlujos = await ejecutarFlujosAutomatizados(empresa.id, contacto, contenidoEntrada, conversacion, from);
            if (resultadoFlujos.handled) {
              continue;
            }

            // Router IA: clasifica el mensaje para usar modo/modelo (support/pedidos/agenda/humano)
            let mode = 'support';
            try {
              const empresaFull = await obtenerEmpresaPorId(empresa.id);
              const aiCfg = getAiConfig(empresaFull, config);
              if (aiCfg?.provider === 'gemini' && aiCfg.apiKey) {
                const routerModel = (empresaFull?.ai_model_router || 'gemini-2.5-flash').toString().trim() || 'gemini-2.5-flash';
                const routerPrompt =
                  'Eres un clasificador. Devuelve SOLO una palabra en mayúsculas: PEDIDOS, AGENDA, SOPORTE o HUMANO.\n' +
                  'Reglas:\n' +
                  '- PEDIDOS: intención de comprar, confirmar compra, precio + cierre, envío, dirección.\n' +
                  '- AGENDA: agendar cita, instalar, reservar fecha/hora.\n' +
                  '- HUMANO: pide agente, hablar con persona, queja fuerte.\n' +
                  '- SOPORTE: resto.\n';
                const r = await generateContent(
                  { provider: aiCfg.provider, apiKey: aiCfg.apiKey, systemPrompt: routerPrompt, userMessage: contenidoEntrada },
                  { ...config, gemini: { ...(config.gemini || {}), model: routerModel, maxOutputTokens: 32, temperature: 0 } }
                );
                const out = (r.text || '').trim().toUpperCase();
                if (out.includes('PEDIDOS')) mode = 'pedidos';
                else if (out.includes('AGENDA')) mode = 'agenda';
                else if (out.includes('HUMANO')) mode = 'support'; // se atiende con bot pero ya marcamos pide agente por reglas previas
                else mode = 'support';
              }
            } catch (eRoute) {
              // si falla, seguir con soporte
            }

            // Auto-crear pedido si el cliente confirma compra de un producto del catálogo
            try {
              const rPedido = await tryCrearPedidoDesdeWhatsapp({
                empresaId: empresa.id,
                contacto,
                conversacion,
                fromPhone: from,
                texto: contenidoEntrada,
              });
              if (rPedido?.ok && (rPedido.pedido || rPedido.yaExistia)) {
                const pedidoId = rPedido.pedido?.id || rPedido.pedidoId;
                const prod = rPedido.producto;
                const textoRespuesta = rPedido.yaExistia
                  ? `Perfecto. Ya tengo tu pedido en proceso (ID: ${pedidoId}). Para finalizar, envíame:\n1) Nombre completo\n2) Ciudad\n3) Dirección\n4) Barrio / punto de referencia\n5) Forma de pago`
                  : `Listo, confirmado. Te acabo de crear el pedido (ID: ${pedidoId}) para: ${prod?.nombre || 'el producto'}.\n\nPara finalizar, envíame:\n1) Nombre completo\n2) Ciudad\n3) Dirección\n4) Barrio / punto de referencia\n5) Forma de pago`;
                const sent = await enviarMensajeEmpresa(empresa.id, from, textoRespuesta);
                if (sent.ok) {
                  await mensajeModel.crear(empresa.id, conversacion.id, { origen: 'bot', contenido: textoRespuesta, esEntrada: false });
                  await conversacionModel.actualizarUltimoMensaje(conversacion.id);
                  await contactoModel.actualizarUltimoMensajeContacto(empresa.id, contacto.id, { lastMessage: textoRespuesta, lastMessageAt: new Date() });
                }
                continue;
              }
            } catch (ePedido) {
              console.warn('[WhatsApp] Error creando pedido automático:', ePedido.message);
            }

            const textoParaBot =
              (text && String(text).trim()) ||
              (contenidoEntrada &&
              contenidoEntrada !== '[mensaje no texto]' &&
              contenidoEntrada !== '[audio no transcrito]'
                ? contenidoEntrada
                : '');

            if (textoParaBot) {
              let respuestaEnviada = null;
              try {
                const { respuesta, error } = await generarRespuestaBot(empresa.id, textoParaBot, { contactId: contacto.id, conversacionId: conversacion.id, mode });
                if (respuesta && respuesta.trim()) {
                  const respuestaLimpia = await extraerYCrearCitaSiHay(empresa.id, contacto.id, respuesta.trim());
                  let textoEnviar = respuestaLimpia || respuesta.trim();
                  if (mode === 'pedidos') {
                    textoEnviar = await extraerYCrearPedidoSiHay(empresa.id, contacto.id, conversacion.id, textoEnviar);
                  }
                  const baseUrl = (config.publicBaseUrl || config.whatsapp?.publicWebhookBaseUrl || '').replace(/\/$/, '');
                  const { textoLimpio, urlsImagen, urlsAudio } = extraerImagenesYAudiosDeRespuesta(textoEnviar, baseUrl);
                  textoEnviar = textoLimpio || textoEnviar;
                  const sent = await enviarMensajeEmpresa(empresa.id, from, textoEnviar);
                  if (!sent.ok) {
                    console.warn('[WhatsApp] No se pudo enviar respuesta del bot:', sent.error, { empresaId: empresa.id, from });
                  }
                  if (sent.ok) {
                    for (const imgUrl of urlsImagen.slice(0, 5)) {
                      try {
                        await enviarImagenEmpresa(empresa.id, from, imgUrl, '');
                        await new Promise((r) => setTimeout(r, 500));
                      } catch (eImg) {
                        console.warn('[WhatsApp] Error enviando imagen:', eImg.message);
                      }
                    }
                    for (const audioUrl of urlsAudio.slice(0, 2)) {
                      try {
                        await enviarAudioEmpresa(empresa.id, from, audioUrl);
                        await new Promise((r) => setTimeout(r, 500));
                      } catch (eAud) {
                        console.warn('[WhatsApp] Error enviando audio:', eAud.message);
                      }
                    }
                    await mensajeModel.crear(empresa.id, conversacion.id, { origen: 'bot', contenido: textoEnviar, esEntrada: false });
                    await conversacionModel.actualizarUltimoMensaje(conversacion.id);
                    await contactoModel.actualizarUltimoMensajeContacto(empresa.id, contacto.id, { lastMessage: textoEnviar, lastMessageAt: new Date() });
                    respuestaEnviada = true;
                    if (esConsultaProductos(textoParaBot) && baseUrl) {
                      try {
                        const productos = await productoModel.listarActivos(empresa.id, { limit: 20 });
                        const conImagen = (productos || []).filter((p) => p.imagen_url && String(p.imagen_url).trim());
                        const urlCompleta = (path) => (path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : '/' + path}`);
                        for (const p of conImagen.slice(0, 5)) {
                          await enviarImagenEmpresa(empresa.id, from, urlCompleta(p.imagen_url), `${p.nombre} – ${Number(p.precio || 0).toLocaleString('es-CO')} ${p.moneda || 'COP'}`);
                          await new Promise((r) => setTimeout(r, 600));
                        }
                      } catch (eImg) {
                        console.warn('[WhatsApp] Error enviando fotos de productos:', eImg.message);
                      }
                    }
                    const useAudioEnv = process.env.BOT_ENVIAR_RESPUESTA_EN_AUDIO === 'true';
                    const useAudio = useAudioEnv || debeUsarAudioParaRespuesta(textoEnviar, useAudioEnv);
                    if (useAudio && textoEnviar.length >= 10 && textoEnviar.length <= 2500) {
                      try {
                        const empresaFull = await obtenerEmpresaPorId(empresa.id);
                        const aiConfig = getAiConfig(empresaFull, config);
                        const geminiKey = config.gemini?.apiKey || (aiConfig?.provider === 'gemini' ? aiConfig.apiKey : null);
                        const ttsModel = config.gemini?.ttsModel || process.env.GEMINI_TTS_MODEL || 'gemini-2.5-pro-preview-tts';
                        let audioBuffer = null;
                        let audioMime = 'audio/mpeg';
                        if (geminiKey) {
                          const geminiAudio = await textoAVozGemini(textoEnviar, geminiKey, ttsModel);
                          if (geminiAudio?.buffer) {
                            audioBuffer = geminiAudio.buffer;
                            audioMime = geminiAudio.mimeType || 'audio/mpeg';
                          }
                        }
                        if (!audioBuffer && config.openai?.apiKey) {
                          audioBuffer = await textoAVozOpenAI(textoEnviar, config.openai.apiKey);
                        }
                        if (audioBuffer) {
                          await new Promise((r) => setTimeout(r, 400));
                          await subirYEnviarAudioEmpresa(empresa.id, from, audioBuffer, audioMime);
                        }
                      } catch (eAudio) {
                        console.warn('[WhatsApp] Error enviando respuesta en audio:', eAudio.message);
                      }
                    }
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

async function resolverPhoneNumberIdPorAccessToken(accessToken) {
  // Intenta encontrar phone_number_id a partir de la WABA del usuario.
  const meRes = await axios.get(`${FB_GRAPH}/me`, {
    params: {
      fields: 'businesses{owned_whatsapp_business_accounts{id,name,phone_numbers}}',
      access_token: accessToken,
    },
  });

  const businesses = meRes.data?.businesses?.data;
  if (!Array.isArray(businesses) || businesses.length === 0) return null;

  for (const biz of businesses) {
    const wabas = biz.owned_whatsapp_business_accounts?.data;
    if (!Array.isArray(wabas) || wabas.length === 0) continue;

    for (const waba of wabas) {
      const wabaId = waba?.id;
      if (!wabaId) continue;

      const phoneRes = await axios.get(`${FB_GRAPH}/${wabaId}/phone_numbers`, {
        params: { access_token: accessToken },
      });
      const phones = phoneRes.data?.data;
      if (Array.isArray(phones) && phones.length > 0) {
        return String(phones[0].id);
      }
    }
  }

  return null;
}

async function cloudStatus(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const row = await getWhatsappConfig(empresaId);
    const token = row?.whatsapp_cloud_access_token;
    const phoneId = row?.whatsapp_cloud_phone_number_id;

    // Si ya tenemos token pero todavía no tenemos phone_number_id, intentamos resolverlo
    // automáticamente para que el panel se actualice sin que el usuario “reconecte”.
    const needsResolvePhone = !!(
      token &&
      !esPlaceholderToken(token) &&
      (!phoneId || esPlaceholderPhoneId(phoneId))
    );

    if (needsResolvePhone) {
      const now = Date.now();
      const lastAttempt = phoneResolveAttemptAt.get(empresaId) || 0;
      // throttle: ~45s (alineado con reintentos del panel)
      if (now - lastAttempt > 45 * 1000) {
        phoneResolveAttemptAt.set(empresaId, now);
        try {
          const resolvedPhoneId = await resolverPhoneNumberIdPorAccessToken(token);
          if (resolvedPhoneId) {
            await updateWhatsappConfig(empresaId, { phoneNumberId: resolvedPhoneId });
          }
        } catch (e) {
          console.warn('[cloudStatus] resolverPhoneNumberIdPorAccessToken falló:', e.message || e);
        }
      }
    }

    const row2 = needsResolvePhone ? await getWhatsappConfig(empresaId) : row;
    const configurado = isCloudConfigurado(row2 || {});
    const facebookConectado = !!(token && !esPlaceholderToken(token));
    const numeroConectado = !!(row2?.whatsapp_cloud_phone_number_id && !esPlaceholderPhoneId(row2.whatsapp_cloud_phone_number_id));
    return res.status(200).json({
      ok: true,
      configurado,
      facebookConectado,
      whatsappDetectado: configurado,
      numeroConectado,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

/**
 * GET /whatsapp/config — datos para el formulario manual (nunca devuelve el token completo).
 */
async function cloudConfigGet(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const row = await getWhatsappConfig(empresaId);
    const token = row?.whatsapp_cloud_access_token;
    const phoneId = row?.whatsapp_cloud_phone_number_id;
    return res.status(200).json({
      phoneNumberId: phoneId && !esPlaceholderPhoneId(phoneId) ? String(phoneId) : '',
      hasAccessToken: !!(token && !esPlaceholderToken(token)),
    });
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

/**
 * POST /whatsapp/register-phone — registra el número en Cloud API (evita error #133010 Account not registered).
 * Body: { pin: "123456" } — 6 dígitos; será el PIN de verificación en dos pasos del número (o el que ya uses en WhatsApp Business).
 */
async function cloudRegisterPhone(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });

    const row = await getWhatsappConfig(empresaId);
    if (!isCloudConfigurado(row || {})) {
      return res.status(400).json({
        message: 'Configura antes el Access Token y Phone Number ID (conexión con Meta).',
      });
    }

    let pin = req.body?.pin;
    if (pin === undefined || pin === null || String(pin).trim() === '') {
      pin = process.env.WHATSAPP_REGISTER_DEFAULT_PIN || '';
    }
    pin = String(pin).replace(/\D/g, '');
    if (pin.length !== 6) {
      return res.status(400).json({
        message:
          'Indica un PIN de 6 dígitos (código de verificación en dos pasos del número en WhatsApp Business).',
      });
    }

    const token = row.whatsapp_cloud_access_token;
    const phoneNumberId = row.whatsapp_cloud_phone_number_id;
    const url = `${CLOUD_API_BASE}/${phoneNumberId}/register`;
    const payload = {
      messaging_product: 'whatsapp',
      pin,
    };

    const { data } = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return res.status(200).json({
      ok: true,
      message: 'Número registrado en Cloud API. Ya puedes enviar mensajes de prueba.',
      data: data || {},
    });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error('cloudRegisterPhone:', err.response?.data || err);
    return res.status(err.response?.status || 500).json({ message: msg || 'Error al registrar el número en Cloud API' });
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
  cloudConfigGet,
  cloudConfigUpdate,
  cloudRegisterPhone,
  cloudSend,
  isCloudConfigurado,
  enviarMensajeEmpresa,
  enviarAudioTtsEmpresa,
};
