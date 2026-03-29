/**
 * Clasifica el estado del lead (CRM) con IA según el historial de WhatsApp.
 * Se programa en segundo plano tras mensajes entrantes/salientes; no bloquea webhooks.
 */
const config = require('../config/env');
const { obtenerEmpresaPorId } = require('../models/empresaModel');
const contactoModel = require('../models/contactoModel');
const mensajeModel = require('../models/mensajeModel');
const { getAiConfig, generateContent } = require('./aiProviderService');

const ALLOWED_LEAD_STATUS = [
  'new',
  'contacted',
  'interested',
  'warm',
  'hot',
  'scheduled',
  'buyer',
  'converted',
  'lost',
];

/** Orden de embudo (mayor = más avanzado). lost es especial. */
const LEAD_RANK = {
  lost: -1,
  new: 0,
  contacted: 1,
  interested: 2,
  warm: 3,
  scheduled: 4,
  hot: 4,
  buyer: 5,
  converted: 6,
};

function rankOf(status) {
  const k = (status || 'new').toString().trim().toLowerCase();
  return k in LEAD_RANK ? LEAD_RANK[k] : 0;
}

function shouldApplyLeadUpdate(current, proposed) {
  if (!proposed || !ALLOWED_LEAD_STATUS.includes(proposed)) return false;
  const c = (current || 'new').toString().trim().toLowerCase();
  const p = proposed.toLowerCase();
  if (p === c) return false;
  if (p === 'lost') return true;
  return rankOf(p) >= rankOf(c);
}

function etiquetaRemitente(m) {
  if (m.es_entrada) return 'Cliente';
  const o = (m.origen || '').toString().toLowerCase();
  if (o === 'agente') return 'Asesor';
  if (o === 'bot') return 'Bot';
  return 'Sistema';
}

function construirTranscript(mensajes) {
  const lines = [];
  for (const m of mensajes) {
    const tipo = (m.message_type || 'text').toString();
    let texto = (m.contenido || '').toString().trim();
    if (!texto) continue;
    if (tipo === 'image' && !texto.startsWith('[')) texto = `[imagen] ${texto}`;
    if (tipo === 'audio') texto = `[audio] ${texto}`;
    if (tipo === 'document') texto = `[archivo] ${texto}`;
    lines.push(`${etiquetaRemitente(m)}: ${texto.slice(0, 1200)}`);
  }
  return lines.join('\n');
}

function parseLeadStatusFromModelText(text) {
  const raw = (text || '').trim();
  if (!raw) return null;
  const jsonMatch = raw.match(/\{[\s\S]*"lead_status"[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const j = JSON.parse(jsonMatch[0]);
    const s = String(j.lead_status || '')
      .trim()
      .toLowerCase();
    return ALLOWED_LEAD_STATUS.includes(s) ? s : null;
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `Eres un clasificador de leads para un CRM de WhatsApp. Analiza la conversación (últimos mensajes) y el estado actual del lead.

Debes responder SOLO un JSON válido en una sola línea, sin markdown, con esta forma exacta:
{"lead_status":"<valor>"}

Valores permitidos (inglés, minúsculas):
- new: primer contacto o aún sin interacción útil de la empresa/bot.
- contacted: el bot o un asesor ya respondió y hubo diálogo, pero el interés comercial no está claro.
- interested: el cliente muestra interés en producto/servicio, precio o información comercial.
- warm: buena intención, hace preguntas concretas, va encaminado.
- hot: muy cerca de comprar, pide cómo pagar, confirma, urgencia.
- scheduled: quiere o confirma cita, demo, instalación o visita con fecha/hora.
- buyer: está comprando, confirmó pedido, pidió factura/envío o cerró compra.
- converted: ya es cliente (compra completada o relación establecida como cliente).
- lost: rechaza, pide no contactar, dice que no le interesa, o corta la conversación comercial.

Reglas:
- Sé conservador: no inventes compras que no se mencionen.
- Si hay duda entre dos niveles, elige el menor (menos avanzado).
- Si el estado actual ya es muy avanzado y la charla solo es soporte, puedes mantener el mismo nivel devolviendo exactamente ese mismo valor en lead_status.`;

const debouncers = new Map();
const DEBOUNCE_MS = 3800;

async function ejecutarClasificacionLead(empresaId, contactoId, conversacionId) {
  if (!empresaId || !contactoId || !conversacionId) return;

  const empresa = await obtenerEmpresaPorId(empresaId);
  if (!empresa) return;

  const aiCfg = getAiConfig(empresa, config);
  if (!aiCfg?.apiKey) return;

  const contacto = await contactoModel.getById(empresaId, contactoId);
  if (!contacto) return;

  const mensajes = await mensajeModel.listarUltimosPorConversacion(empresaId, conversacionId, 36);
  const transcript = construirTranscript(mensajes);
  if (!transcript || transcript.length < 8) return;

  const actual = (contacto.lead_status || 'new').toString().trim().toLowerCase();

  const userMessage =
    `Estado actual del lead en el CRM: "${actual}"\n\n` +
    `Transcript (más reciente al final):\n${transcript}\n\n` +
    'Devuelve solo el JSON con lead_status.';

  const model =
    (empresa.ai_model_router && String(empresa.ai_model_router).trim()) || 'gemini-2.5-flash';

  const { text, error } = await generateContent(
    { provider: aiCfg.provider, apiKey: aiCfg.apiKey, systemPrompt: SYSTEM_PROMPT, userMessage },
    { ...config, gemini: { ...(config.gemini || {}), model, maxOutputTokens: 96, temperature: 0 } }
  );

  if (error || !text) return;

  const propuesto = parseLeadStatusFromModelText(text);
  if (!propuesto) return;

  if (!shouldApplyLeadUpdate(actual, propuesto)) return;

  try {
    await contactoModel.actualizar(empresaId, contactoId, { lead_status: propuesto });
  } catch (e) {
    console.warn('[LeadClassifier] No se pudo actualizar lead_status:', e.message);
  }
}

/**
 * Encola la clasificación (debounce por contacto): varios mensajes seguidos = una sola llamada a la IA.
 */
function scheduleLeadClassification(empresaId, contactoId, conversacionId) {
  if (!empresaId || !contactoId || !conversacionId) return;
  const key = `${empresaId}:${contactoId}`;
  const prev = debouncers.get(key);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => {
    debouncers.delete(key);
    ejecutarClasificacionLead(empresaId, contactoId, conversacionId).catch((e) =>
      console.warn('[LeadClassifier]', e.message)
    );
  }, DEBOUNCE_MS);
  debouncers.set(key, t);
}

module.exports = {
  scheduleLeadClassification,
  ejecutarClasificacionLead,
  ALLOWED_LEAD_STATUS,
  shouldApplyLeadUpdate,
};
