const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const config = require('../config/env');
const {
  getWhatsappConfig,
  updateWhatsappConfig,
  getEmpresaByWhatsappPhoneNumberId,
  getEmpresaByWhatsappWabaId,
  getEmpresaByWhatsappDisplayDigits,
  obtenerEmpresaPorId,
} = require('../models/empresaModel');
const contactoModel = require('../models/contactoModel');
const conversacionModel = require('../models/conversacionModel');
const mensajeModel = require('../models/mensajeModel');
const pedidoModel = require('../models/pedidoModel');
const appointmentModel = require('../models/appointmentModel');
const productoModel = require('../models/productoModel');
const planModel = require('../models/planModel');
const flowModel = require('../models/flowModel');
const conversationStateModel = require('../models/conversationStateModel');
const { generarRespuestaBot } = require('./iaController');
const { getAiConfig, generateContent, textoAVozGemini } = require('../services/aiProviderService');
const { subscribeAppToWabaEdge } = require('../services/whatsappSubscribeWaba');
const execFileAsync = promisify(execFile);

const CLOUD_API_BASE = (config.whatsapp && config.whatsapp.cloudApiBaseUrl) ? config.whatsapp.cloudApiBaseUrl.replace(/\/$/, '') : 'https://graph.facebook.com/v19.0';
const FB_GRAPH = 'https://graph.facebook.com/v19.0';

// Evita spam de Graph API al sincronizar phone_number_id desde Meta (GET /whatsapp/status).
const phoneIdSyncFromMetaAt = new Map(); // empresaId -> timestamp(ms)
const wabaIdSyncFromMetaAt = new Map(); // empresaId -> timestamp(ms)

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
    /\b(asesor|agente|humano)\s+por\s+favor\b/,
    /\bquiero\s+un\s+asesor\b/,
    /\b(atención\s+)?(humana|personal)\b/,
    /\b(contactar|hablar)\s+con\s+(alguien|alguien\s+de)\b/,
  ];
  return frases.some((r) => r.test(t));
}

/**
 * URL absoluta HTTPS para que Meta descargue imagen/documento (WhatsApp exige link público).
 * Normaliza /uploads/... → /api/uploads/... para despliegues donde solo se proxya /api al backend.
 */
function resolvePublicMediaUrl(relativeOrAbsolute) {
  const raw = String(relativeOrAbsolute || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = (config.publicBaseUrl || config.whatsapp?.publicWebhookBaseUrl || '').replace(/\/$/, '');
  if (!base) return null;
  let p = raw.startsWith('/') ? raw : `/${raw}`;
  if (p.startsWith('/uploads/') && !p.startsWith('/api/')) p = `/api${p}`;
  return `${base}${p}`;
}

/** Parsea [IMAGEN: path] en la respuesta; limpia también marcadores [AUDIO: ...]. */
function extraerImagenesYAudiosDeRespuesta(respuesta) {
  if (!respuesta || typeof respuesta !== 'string') return { textoLimpio: respuesta, urlsImagen: [], urlsAudio: [] };
  const urlsImagen = [];
  const urlsAudio = [];
  let textoLimpio = respuesta;
  const reImagen = /\[?IMAGEN:\s*([^\]\n]+)\]?/gi;
  let m;
  while ((m = reImagen.exec(respuesta)) !== null) {
    const pathRaw = (m[1] || '').trim();
    if (pathRaw) {
      const url = resolvePublicMediaUrl(pathRaw);
      if (url) urlsImagen.push(url);
    }
  }
  textoLimpio = respuesta
    .replace(/\s*\[?IMAGEN:\s*[^\]\n]+\]?\s*/gi, '\n')
    .replace(/\s*\[?AUDIO:\s*[^\]\n]+\]?\s*/gi, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
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

/** Envía un documento/archivo por WhatsApp Cloud API (URL pública). */
async function enviarDocumentoEmpresa(empresaId, toPhone, documentUrl, filename = 'archivo') {
  const row = await getWhatsappConfig(empresaId);
  if (!row?.whatsapp_cloud_access_token || !row?.whatsapp_cloud_phone_number_id) return { ok: false, error: 'WhatsApp no configurado' };
  const url = `${CLOUD_API_BASE}/${row.whatsapp_cloud_phone_number_id}/messages`;
  const toNumber = String(toPhone).replace(/\D/g, '');
  try {
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: toNumber,
        type: 'document',
        document: { link: documentUrl, filename: filename || 'archivo' },
      },
      { headers: { Authorization: `Bearer ${row.whatsapp_cloud_access_token}`, 'Content-Type': 'application/json' }, timeout: 20000 }
    );
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
function normalizeOutgoingAudioMime(mimeType = '') {
  const m = String(mimeType || '').toLowerCase();
  if (!m) return { mime: 'audio/ogg', ext: 'ogg' };
  if (m.includes('webm')) return { mime: 'audio/webm', ext: 'webm' };
  if (m.includes('ogg') || m.includes('opus')) return { mime: 'audio/ogg', ext: 'ogg' };
  if (m.includes('mp4') || m.includes('m4a')) return { mime: 'audio/mp4', ext: 'm4a' };
  if (m.includes('mpeg') || m.includes('mp3')) return { mime: 'audio/mpeg', ext: 'mp3' };
  if (m.includes('aac')) return { mime: 'audio/aac', ext: 'aac' };
  if (m.includes('amr')) return { mime: 'audio/amr', ext: 'amr' };
  return { mime: 'audio/ogg', ext: 'ogg' };
}

async function convertToPreferredAudio(buffer, mimeType) {
  const out = normalizeOutgoingAudioMime(mimeType);
  const shouldForceConvert = true; // maximize compatibilidad para notas de voz
  const tmpDir = path.join(os.tmpdir(), 'wa-audio-convert');
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
  } catch (_) {}
  const inExt = out.ext || 'bin';
  const base = `wa-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const inputPath = path.join(tmpDir, `${base}.${inExt}`);
  const outputPath = path.join(tmpDir, `${base}.ogg`);
  try {
    if (!shouldForceConvert) return { ok: true, buffer, mimeType: out.mime };
    fs.writeFileSync(inputPath, buffer);
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-map_metadata',
      '-1',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-c:a',
      'libopus',
      '-b:a',
      '24k',
      '-vbr',
      'on',
      '-compression_level',
      '10',
      '-f',
      'ogg',
      outputPath,
    ]);
    const converted = fs.readFileSync(outputPath);
    return { ok: true, buffer: converted, mimeType: 'audio/ogg' };
  } catch (e) {
    const msg = String(e?.message || '');
    if (/ffmpeg/i.test(msg) || /not recognized|ENOENT/i.test(msg)) {
      // Si no hay ffmpeg, usamos el original solo si NO es webm.
      if (!out.mime.includes('webm')) {
        return { ok: true, buffer, mimeType: out.mime };
      }
      return { ok: false, error: 'El servidor no tiene ffmpeg instalado para convertir audio/webm. Instala ffmpeg en el VPS.' };
    }
    // Si la conversión falla por otra razón, intentar enviar original (excepto webm).
    if (!out.mime.includes('webm')) {
      return { ok: true, buffer, mimeType: out.mime };
    }
    return { ok: false, error: `No se pudo convertir audio webm: ${msg}` };
  } finally {
    try { fs.unlinkSync(inputPath); } catch (_) {}
    try { fs.unlinkSync(outputPath); } catch (_) {}
  }
}

async function subirYEnviarAudioEmpresa(empresaId, toPhone, audioBuffer, mimeType = 'audio/mpeg') {
  const row = await getWhatsappConfig(empresaId);
  if (!row?.whatsapp_cloud_access_token || !row?.whatsapp_cloud_phone_number_id) return { ok: false, error: 'WhatsApp no configurado' };
  const out = normalizeOutgoingAudioMime(mimeType);
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', audioBuffer, { filename: `audio.${out.ext}`, contentType: out.mime });
  form.append('messaging_product', 'whatsapp');
  form.append('type', out.mime);
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

/** Envía una nota de voz real (buffer) por WhatsApp Cloud API. */
async function enviarAudioArchivoEmpresa(empresaId, toPhone, audioBuffer, mimeType = 'audio/ogg') {
  if (!audioBuffer || !Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) {
    return { ok: false, error: 'Audio inválido' };
  }
  try {
    const conv = await convertToPreferredAudio(audioBuffer, mimeType || 'audio/ogg');
    if (!conv.ok) return { ok: false, error: conv.error || 'No se pudo convertir audio' };
    const sent = await subirYEnviarAudioEmpresa(empresaId, toPhone, conv.buffer, conv.mimeType || 'audio/ogg');
    return sent?.ok ? { ok: true } : { ok: false, error: sent?.error || 'No se pudo enviar audio' };
  } catch (e) {
    return { ok: false, error: e.message || 'Error enviando audio' };
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
      const baseUrl = (config.publicBaseUrl || config.whatsapp?.publicWebhookBaseUrl || '').replace(/\/$/, '');
      const toAbsUrl = (u) => {
        const raw = String(u || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        return `${baseUrl}${raw.startsWith('/') ? raw : '/' + raw}`;
      };

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

      if (accion === 'enviar_audio') {
        const audioUrl = toAbsUrl(valor);
        if (!audioUrl) return { handled: true };
        const sent = await enviarAudioEmpresa(empresaId, fromPhone, audioUrl);
        if (sent.ok) {
          await mensajeModel.crear(empresaId, conversacion.id, { origen: 'bot', contenido: '[audio automático enviado]', esEntrada: false });
          await conversacionModel.actualizarUltimoMensaje(conversacion.id);
          if (contacto.id) {
            await contactoModel.actualizarUltimoMensajeContacto(empresaId, contacto.id, { lastMessage: '[audio automático enviado]', lastMessageAt: new Date() });
          }
        }
        return { handled: true };
      }

      if (accion === 'enviar_archivo') {
        const docUrl = toAbsUrl(valor);
        if (!docUrl) return { handled: true };
        const nameGuess = docUrl.split('/').pop() || 'archivo';
        const sent = await enviarDocumentoEmpresa(empresaId, fromPhone, docUrl, nameGuess);
        if (sent.ok) {
          await mensajeModel.crear(empresaId, conversacion.id, { origen: 'bot', contenido: '[archivo automático enviado]', esEntrada: false });
          await conversacionModel.actualizarUltimoMensaje(conversacion.id);
          if (contacto.id) {
            await contactoModel.actualizarUltimoMensajeContacto(empresaId, contacto.id, { lastMessage: '[archivo automático enviado]', lastMessageAt: new Date() });
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

/**
 * Procesa mensajes entrantes tras responder 200 a Meta.
 * Antes el handler esperaba a la IA y el envío de respuesta; nginx/Meta pueden cortar por tiempo
 * y el cliente ve “un solo check” o no recibe respuesta aunque el envío de prueba desde el panel funcione.
 */
async function procesarCloudWebhookBody(body) {
  try {
    for (const entry of body.entry) {
      const wabaFromEntry =
        entry?.id === undefined || entry?.id === null ? null : String(entry.id).replace(/\s+/g, '').trim();
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (Array.isArray(value?.statuses) && value.statuses.length > 0) {
          for (const st of value.statuses) {
            if (String(st?.status || '').toLowerCase() === 'failed') {
              console.warn('[WhatsApp status failed]', {
                id: st?.id || null,
                recipient: st?.recipient_id || null,
                errors: st?.errors || [],
              });
            }
          }
        }
        const rawPid = value?.metadata?.phone_number_id;
        const phoneNumberId =
          rawPid === undefined || rawPid === null ? null : String(rawPid).replace(/\s+/g, '').trim();
        let empresa = phoneNumberId ? await getEmpresaByWhatsappPhoneNumberId(phoneNumberId) : null;
        let resolvedByDisplay = false;
        if (!empresa?.id && value?.metadata?.display_phone_number) {
          empresa = await getEmpresaByWhatsappDisplayDigits(value.metadata.display_phone_number);
          resolvedByDisplay = !!empresa?.id;
          if (resolvedByDisplay && phoneNumberId) {
            try {
              await updateWhatsappConfig(empresa.id, { phoneNumberId });
              console.warn(
                '[WhatsApp webhook] phone_number_id actualizado desde Meta (antes no coincidía con la BD). Empresa',
                empresa.id
              );
            } catch (eUp) {
              console.warn('[WhatsApp webhook] No se pudo guardar phone_number_id:', eUp.message);
            }
          }
        }
        if (!empresa?.id && wabaFromEntry) {
          empresa = await getEmpresaByWhatsappWabaId(wabaFromEntry);
          if (empresa?.id && phoneNumberId) {
            try {
              await updateWhatsappConfig(empresa.id, { phoneNumberId });
              console.warn(
                '[WhatsApp webhook] Empresa resuelta por WABA (entry.id); phone_number_id sincronizado. Empresa',
                empresa.id
              );
            } catch (eUp) {
              console.warn('[WhatsApp webhook] No se pudo guardar phone_number_id (WABA):', eUp.message);
            }
          }
        }
        if (!empresa?.id) {
          if (value?.messages?.length) {
            /** Meta "Probar" webhook envía phone_number_id 123456123 y display 16505551111; no es un mensaje real. */
            const esPruebaMetaUi =
              String(phoneNumberId || '').trim() === '123456123' ||
              String(value?.metadata?.display_phone_number || '')
                .replace(/\D/g, '') === '16505551111';
            if (esPruebaMetaUi) {
              console.log(
                '[WhatsApp webhook] Payload de PRUEBA (botón Test en Meta). Ignorado: no coincide con ninguna empresa; es normal. Mensajes reales traen otro phone_number_id largo.'
              );
            } else {
              console.warn('[WhatsApp webhook] Sin empresa para mensajes entrantes.', {
                phone_number_id: phoneNumberId || '(vacío)',
                display_phone_number: value?.metadata?.display_phone_number || '(vacío)',
                waba_entry_id: wabaFromEntry || '(vacío)',
                hint:
                  'Comprueba Phone number ID en Meta vs CRM, telefono_whatsapp en la empresa, o vuelve a conectar WhatsApp para guardar WABA (entry.id).',
              });
            }
          }
          continue;
        }

        if (value?.messages) {
          console.log('[WhatsApp webhook] Procesando mensaje(s) empresa', empresa.id, 'n=', value.messages.length);
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

            // Producción: audios desactivados en backend para evitar flujo inestable.
            if ((type === 'audio' || type === 'voice') && msg.audio?.id) {
              text = '[audio recibido]';
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

            // Si el cliente pide hablar con una persona/agente real:
            // 1) marcar para notificación en CRM, 2) confirmar recepción, 3) pausar la IA.
            const yaPideAgente = !!conversacion.pide_agente_humano;
            const pideAgenteAhora = clientePideAgenteHumano(contenidoEntrada);
            try {
              await conversationStateModel.setMotorState(empresa.id, contacto.id, {
                estado_operativo: yaPideAgente ? 'espera_asesor' : 'bot_activo',
                intencion_actual: yaPideAgente ? 'humano' : 'soporte',
                paso_actual: 'mensaje_recibido',
                bloqueo_bot: yaPideAgente,
                updated_by: 'webhook_inbound',
              });
            } catch (_) {}
            if (pideAgenteAhora && !yaPideAgente) {
              try {
                await conversacionModel.marcarPideAgente(conversacion.id);
              } catch (e) {}
              try {
                await conversationStateModel.setMotorState(empresa.id, contacto.id, {
                  estado_operativo: 'espera_asesor',
                  intencion_actual: 'humano',
                  paso_actual: 'solicitud_humano_detectada',
                  bloqueo_bot: true,
                  updated_by: 'detector_humano',
                });
              } catch (_) {}
              const confirmacionHumano =
                'Perfecto, ya notifiqué a un asesor humano. En breve te atiende por este mismo chat de WhatsApp.';
              try {
                const sent = await enviarMensajeEmpresa(empresa.id, from, confirmacionHumano);
                if (sent.ok) {
                  await mensajeModel.crear(empresa.id, conversacion.id, {
                    origen: 'bot',
                    contenido: confirmacionHumano,
                    esEntrada: false,
                  });
                  await conversacionModel.actualizarUltimoMensaje(conversacion.id);
                  await contactoModel.actualizarUltimoMensajeContacto(empresa.id, contacto.id, {
                    lastMessage: confirmacionHumano,
                    lastMessageAt: new Date(),
                  });
                }
              } catch (e) {}
              continue;
            }

            // Mientras siga marcada para asesor humano, no ejecutar IA ni automatizaciones.
            if (yaPideAgente) {
              try {
                await conversationStateModel.setMotorState(empresa.id, contacto.id, {
                  estado_operativo: 'espera_asesor',
                  intencion_actual: 'humano',
                  paso_actual: 'en_cola_de_asesor',
                  bloqueo_bot: true,
                  updated_by: 'detector_humano',
                });
              } catch (_) {}
              continue;
            }

            // Flujos / automatizaciones antes de llamar a la IA
            const resultadoFlujos = await ejecutarFlujosAutomatizados(empresa.id, contacto, contenidoEntrada, conversacion, from);
            if (resultadoFlujos.handled) {
              try {
                await conversationStateModel.setMotorState(empresa.id, contacto.id, {
                  estado_operativo: 'bot_activo',
                  intencion_actual: 'soporte',
                  paso_actual: 'flujo_automatizado',
                  bloqueo_bot: false,
                  updated_by: 'flow_engine',
                });
              } catch (_) {}
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
                  try {
                    await conversationStateModel.setMotorState(empresa.id, contacto.id, {
                      estado_operativo: 'post_venta',
                      intencion_actual: 'pedido',
                      paso_actual: 'pedido_confirmado',
                      bloqueo_bot: false,
                      updated_by: 'pedido_auto',
                      extra: { pedido_id: pedidoId || null },
                    });
                  } catch (_) {}
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
              try {
                const intentMap = { pedidos: 'pedido', agenda: 'agenda', support: 'soporte' };
                await conversationStateModel.setMotorState(empresa.id, contacto.id, {
                  estado_operativo: 'bot_activo',
                  intencion_actual: intentMap[mode] || 'soporte',
                  paso_actual: 'procesando_con_ia',
                  bloqueo_bot: false,
                  updated_by: 'ai_router',
                });
              } catch (_) {}
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
                  const { textoLimpio, urlsImagen, urlsAudio } = extraerImagenesYAudiosDeRespuesta(textoEnviar);
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
                    await mensajeModel.crear(empresa.id, conversacion.id, { origen: 'bot', contenido: textoEnviar, esEntrada: false });
                    await conversacionModel.actualizarUltimoMensaje(conversacion.id);
                    await contactoModel.actualizarUltimoMensajeContacto(empresa.id, contacto.id, { lastMessage: textoEnviar, lastMessageAt: new Date() });
                    try {
                      const pasoPorModo = mode === 'agenda' ? 'agenda_respuesta_enviada' : mode === 'pedidos' ? 'pedido_respuesta_enviada' : 'soporte_respuesta_enviada';
                      await conversationStateModel.setMotorState(empresa.id, contacto.id, {
                        estado_operativo: 'bot_activo',
                        intencion_actual: mode === 'agenda' ? 'agenda' : mode === 'pedidos' ? 'pedido' : 'soporte',
                        paso_actual: pasoPorModo,
                        bloqueo_bot: false,
                        updated_by: 'ai_response',
                      });
                    } catch (_) {}
                    respuestaEnviada = true;
                    if (esConsultaProductos(textoParaBot) && baseUrl) {
                      try {
                        const productos = await productoModel.listarActivos(empresa.id, { limit: 20 });
                        const conImagen = (productos || []).filter((p) => p.imagen_url && String(p.imagen_url).trim());
                        for (const p of conImagen.slice(0, 5)) {
                          const imgUrl = resolvePublicMediaUrl(p.imagen_url);
                          if (!imgUrl) continue;
                          await enviarImagenEmpresa(empresa.id, from, imgUrl, `${p.nombre} – ${Number(p.precio || 0).toLocaleString('es-CO')} ${p.moneda || 'COP'}`);
                          await new Promise((r) => setTimeout(r, 600));
                        }
                      } catch (eImg) {
                        console.warn('[WhatsApp] Error enviando fotos de productos:', eImg.message);
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
    console.error('procesarCloudWebhookBody:', err);
  }
}

async function cloudWebhookPost(req, res) {
  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account' || !body.entry) {
      if (body?.object) {
        console.warn('[WhatsApp webhook] Objeto ignorado (esperado whatsapp_business_account):', body.object);
      }
      return res.status(200).send('ok');
    }

    console.log('[WhatsApp webhook] POST ok', { entries: body.entry?.length });
    res.status(200).send('ok');

    setImmediate(() => {
      procesarCloudWebhookBody(body).catch((err) => {
        console.error('[WhatsApp webhook] Error en procesamiento en segundo plano:', err);
      });
    });
  } catch (err) {
    console.error('cloudWebhookPost:', err);
    if (!res.headersSent) {
      return res.status(200).send('ok');
    }
  }
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
  const fetchFirstPhoneId = async (wabaId) => {
    if (!wabaId) return null;
    try {
      const phoneRes = await axios.get(`${FB_GRAPH}/${wabaId}/phone_numbers`, {
        params: { access_token: accessToken, limit: 25 },
      });
      const phones = phoneRes.data?.data;
      if (Array.isArray(phones) && phones.length > 0) {
        return String(phones[0].id);
      }
    } catch (e) {
      console.warn('[resolverPhoneNumberId] phone_numbers WABA', wabaId, e.response?.data?.error?.message || e.message);
    }
    return null;
  };

  const wabaLists = ['owned_whatsapp_business_accounts', 'client_whatsapp_business_accounts'];

  const tryMeBusinesses = async (fields) => {
    const meRes = await axios.get(`${FB_GRAPH}/me`, {
      params: { fields, access_token: accessToken },
    });
    const businesses = meRes.data?.businesses?.data;
    if (!Array.isArray(businesses) || businesses.length === 0) return null;

    for (const biz of businesses) {
      for (const listKey of wabaLists) {
        const wabas = biz[listKey]?.data;
        if (!Array.isArray(wabas) || wabas.length === 0) continue;
        for (const waba of wabas) {
          const pid = await fetchFirstPhoneId(waba?.id);
          if (pid) return pid;
        }
      }
    }
    return null;
  };

  try {
    const pid = await tryMeBusinesses(
      'businesses{owned_whatsapp_business_accounts{id,name,phone_numbers},client_whatsapp_business_accounts{id,name,phone_numbers}}'
    );
    if (pid) return pid;
  } catch (e) {
    console.warn('[resolverPhoneNumberId] try1:', e.response?.data?.error?.message || e.message);
  }

  try {
    const pid = await tryMeBusinesses('businesses{owned_whatsapp_business_accounts{id},client_whatsapp_business_accounts{id}}');
    if (pid) return pid;
  } catch (e) {
    console.warn('[resolverPhoneNumberId] try2:', e.response?.data?.error?.message || e.message);
  }

  try {
    const pid = await tryMeBusinesses('businesses{owned_whatsapp_business_accounts{id}}');
    if (pid) return pid;
  } catch (e) {
    console.warn('[resolverPhoneNumberId] try3:', e.response?.data?.error?.message || e.message);
  }

  return null;
}

/** Misma lógica que en facebookAuthController: localizar WABA por phone_number_id (rellena whatsapp_waba_id). */
async function resolveWabaIdForPhoneNumberId(accessToken, phoneNumberId) {
  const want = String(phoneNumberId || '').replace(/\s+/g, '').trim();
  if (!want || !accessToken) return null;
  try {
    const meRes = await axios.get(`${FB_GRAPH}/me`, {
      params: {
        fields: 'businesses{owned_whatsapp_business_accounts{id,phone_numbers{id}}}',
        access_token: accessToken,
      },
    });
    const businesses = meRes.data?.businesses?.data;
    if (!Array.isArray(businesses)) return null;
    for (const biz of businesses) {
      const wabas = biz.owned_whatsapp_business_accounts?.data;
      if (!Array.isArray(wabas)) continue;
      for (const waba of wabas) {
        const phones = waba.phone_numbers?.data;
        if (!Array.isArray(phones)) continue;
        for (const p of phones) {
          if (p.id && String(p.id).replace(/\s+/g, '').trim() === want) {
            return String(waba.id);
          }
        }
      }
    }
  } catch (e) {
    console.warn('resolveWabaIdForPhoneNumberId', e.response?.data?.error?.message || e.message);
  }
  return null;
}

async function cloudStatus(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    let row = await getWhatsappConfig(empresaId);
    const token = row?.whatsapp_cloud_access_token;
    const phoneId = row?.whatsapp_cloud_phone_number_id;

    /**
     * Sincronizar whatsapp_cloud_phone_number_id con la API de Meta (mismo ID que envía el webhook).
     * Sin esto, el usuario puede tener token válido pero un ID desfasado → "Sin empresa" en webhooks.
     * Throttle: más frecuente si falta ID; cada ~90s si ya hay ID (corrige desfaces sin copiar nada a mano).
     */
    const tokenOk = token && !esPlaceholderToken(token);
    if (tokenOk) {
      const now = Date.now();
      const missing = !phoneId || esPlaceholderPhoneId(phoneId);
      const intervalMs = missing ? 45 * 1000 : 90 * 1000;
      const last = phoneIdSyncFromMetaAt.get(empresaId) || 0;
      if (now - last >= intervalMs) {
        phoneIdSyncFromMetaAt.set(empresaId, now);
        try {
          const resolvedPhoneId = await resolverPhoneNumberIdPorAccessToken(token);
          if (resolvedPhoneId) {
            const cur = String(row?.whatsapp_cloud_phone_number_id || '').replace(/\s+/g, '').trim();
            if (resolvedPhoneId !== cur) {
              await updateWhatsappConfig(empresaId, { phoneNumberId: resolvedPhoneId });
              row = await getWhatsappConfig(empresaId);
              console.warn('[cloudStatus] phone_number_id sincronizado con Meta (webhooks):', resolvedPhoneId);
            }
          } else if (missing) {
            console.warn(
              '[cloudStatus] No se pudo obtener phone_number_id desde Graph (/me businesses). Permisos del token o vuelve a conectar WhatsApp.'
            );
          }
        } catch (e) {
          console.warn('[cloudStatus] sync phone_number_id Meta:', e.message || e);
        }
      }
    }

    if (tokenOk) {
      const pidClean =
        row?.whatsapp_cloud_phone_number_id && !esPlaceholderPhoneId(row.whatsapp_cloud_phone_number_id)
          ? String(row.whatsapp_cloud_phone_number_id).trim()
          : '';
      const wabaEmpty = !String(row?.whatsapp_waba_id || '').trim();
      if (pidClean && wabaEmpty) {
        const nowW = Date.now();
        const lastW = wabaIdSyncFromMetaAt.get(empresaId) || 0;
        if (nowW - lastW >= 120000) {
          wabaIdSyncFromMetaAt.set(empresaId, nowW);
          try {
            const wabaResolved = await resolveWabaIdForPhoneNumberId(token, pidClean);
            if (wabaResolved) {
              await updateWhatsappConfig(empresaId, { wabaId: wabaResolved });
              row = await getWhatsappConfig(empresaId);
              console.warn('[cloudStatus] whatsapp_waba_id sincronizado desde Graph:', wabaResolved);
            }
          } catch (e) {
            console.warn('[cloudStatus] sync waba_id Meta:', e.message || e);
          }
        }
      }
    }

    const row2 = row;
    const configurado = isCloudConfigurado(row2 || {});
    const facebookConectado = !!(token && !esPlaceholderToken(token));
    const numeroConectado = !!(row2?.whatsapp_cloud_phone_number_id && !esPlaceholderPhoneId(row2.whatsapp_cloud_phone_number_id));
    const pid = row2?.whatsapp_cloud_phone_number_id;
    const wabaStored = row2?.whatsapp_waba_id && String(row2.whatsapp_waba_id).trim();
    return res.status(200).json({
      ok: true,
      configurado,
      facebookConectado,
      whatsappDetectado: configurado,
      numeroConectado,
      /** Mismo ID que Meta envía en el webhook; debe coincidir para que entren conversaciones */
      whatsappPhoneNumberId: pid && !esPlaceholderPhoneId(pid) ? String(pid).trim() : '',
      /** entry.id en webhooks; permite enlazar si había varios números en la misma cuenta WABA */
      whatsappWabaId: wabaStored || '',
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

/**
 * GET /whatsapp/debug-meta — Compara IDs en CRM con Graph (WABA, números, apps suscritas). Diagnóstico sin secretos.
 */
async function cloudDebugMeta(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const row = await getWhatsappConfig(empresaId);
    const token = row?.whatsapp_cloud_access_token;
    let phoneIdLocal = row?.whatsapp_cloud_phone_number_id;
    let wabaLocal = row?.whatsapp_waba_id;

    const out = {
      ok: true,
      enCrm: {
        phoneNumberId: phoneIdLocal && String(phoneIdLocal).trim() ? String(phoneIdLocal).trim() : null,
        wabaId: wabaLocal && String(wabaLocal).trim() ? String(wabaLocal).trim() : null,
      },
      metaGraph: {},
      comparacion: {},
    };

    if (!token || esPlaceholderToken(token)) {
      out.ok = false;
      out.mensaje = 'No hay token de WhatsApp válido. Conecta WhatsApp en el panel.';
      return res.status(200).json(out);
    }

    if ((!wabaLocal || !String(wabaLocal).trim()) && phoneIdLocal && !esPlaceholderPhoneId(phoneIdLocal)) {
      wabaLocal = await resolveWabaIdForPhoneNumberId(token, phoneIdLocal);
      if (wabaLocal) out.enCrm.wabaIdResueltoSoloParaEstaConsulta = String(wabaLocal).trim();
    }

    const wabaId = (wabaLocal && String(wabaLocal).trim()) || (out.enCrm.wabaIdResueltoSoloParaEstaConsulta || '');
    if (!wabaId) {
      out.ok = false;
      out.mensaje =
        'No hay WABA en la BD. Abre WhatsApp Cloud API (sincroniza status) o vuelve a conectar Facebook para guardar whatsapp_waba_id.';
      return res.status(200).json(out);
    }

    try {
      const [subRes, phonesRes] = await Promise.all([
        axios.get(`${FB_GRAPH}/${wabaId}/subscribed_apps`, {
          params: { access_token: token },
          timeout: 15000,
        }),
        axios.get(`${FB_GRAPH}/${wabaId}/phone_numbers`, {
          params: { access_token: token, limit: 50 },
          timeout: 15000,
        }),
      ]);
      out.metaGraph.subscribedApps = subRes.data;
      const phones = phonesRes.data?.data || [];
      out.metaGraph.phoneNumbers = phones.map((p) => ({
        id: p.id ? String(p.id).trim() : '',
        display_phone_number: p.display_phone_number || '',
        verified_name: p.verified_name || '',
      }));
      const idsEnMeta = phones.map((p) => String(p.id || '').replace(/\s+/g, '').trim()).filter(Boolean);
      const pidClean = String(phoneIdLocal || '').replace(/\s+/g, '').trim();
      const coincide = pidClean && idsEnMeta.length ? idsEnMeta.includes(pidClean) : null;
      out.comparacion = {
        phoneNumberIdCoincideConMeta: coincide,
        idsDeNumerosEnMeta: idsEnMeta,
        webhookCallbackDebeSer:
          (config.publicBaseUrl || config.whatsapp?.publicWebhookBaseUrl || '').replace(/\/$/, '') +
          '/api/whatsapp/webhook',
      };
      if (coincide === false) {
        out.comparacion.alerta =
          'El Phone number ID guardado en el CRM no coincide con ningún número de este WABA en Meta. Los webhooks pueden traer otro ID → "Sin empresa" en el servidor. Reconecta WhatsApp o corrige el ID manualmente.';
      }
      if (coincide === true) {
        out.comparacion.nota =
          'IDs coherentes. Si igual no entran mensajes: en developers.facebook.com → Tu app → WhatsApp → Configuración → Webhook: suscribe el campo "messages" y comprueba que la URL sea la de webhookCallbackDebeSer (HTTPS).';
      }
    } catch (e) {
      out.metaGraph.error = e.response?.data?.error || { message: e.message };
      out.ok = false;
    }

    return res.status(200).json(out);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

function cloudWebhookConfig(req, res) {
  const base = (
    (config.whatsapp && config.whatsapp.publicWebhookBaseUrl) ||
    config.publicBaseUrl ||
    ''
  )
    .toString()
    .replace(/\/$/, '');
  const webhookUrl = base ? `${base}/api/whatsapp/webhook` : '';
  const verifyToken = (config.whatsapp && config.whatsapp.cloudVerifyToken) ? config.whatsapp.cloudVerifyToken : '';
  return res.json({ webhookUrl, verifyToken });
}

/**
 * POST /whatsapp/subscribe-waba — Registra la app en el WABA en Meta (necesario para webhooks de mensajes reales).
 */
async function cloudSubscribeWaba(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const row = await getWhatsappConfig(empresaId);
    const token = row?.whatsapp_cloud_access_token;
    if (!token || esPlaceholderToken(token)) {
      return res.status(400).json({ message: 'Falta token de WhatsApp. Conecta la cuenta primero.' });
    }
    let wabaId = row?.whatsapp_waba_id && String(row.whatsapp_waba_id).trim();
    if (!wabaId && row?.whatsapp_cloud_phone_number_id && !esPlaceholderPhoneId(row.whatsapp_cloud_phone_number_id)) {
      wabaId = await resolveWabaIdForPhoneNumberId(token, row.whatsapp_cloud_phone_number_id);
    }
    if (!wabaId) {
      return res.status(400).json({
        message:
          'No hay WABA en la base de datos. Abre esta página para sincronizar o vuelve a conectar Facebook/WhatsApp.',
      });
    }
    const sub = await subscribeAppToWabaEdge(wabaId, token);
    if (!sub.ok) {
      const msg = sub.error?.message || JSON.stringify(sub.error);
      return res.status(502).json({ ok: false, message: msg, meta: sub.error });
    }
    return res.status(200).json({
      ok: true,
      message: 'Listo. Meta debería enviar webhooks de mensajes a tu servidor. Escribe de nuevo desde el móvil.',
      data: sub.data,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = {
  cloudWebhookGet,
  cloudWebhookPost,
  cloudWebhookConfig,
  cloudDebugMeta,
  cloudStatus,
  cloudConfigGet,
  cloudConfigUpdate,
  cloudRegisterPhone,
  cloudSend,
  cloudSubscribeWaba,
  isCloudConfigurado,
  enviarMensajeEmpresa,
  enviarAudioTtsEmpresa,
  enviarAudioArchivoEmpresa,
  enviarImagenEmpresa,
  enviarDocumentoEmpresa,
  resolvePublicMediaUrl,
};
