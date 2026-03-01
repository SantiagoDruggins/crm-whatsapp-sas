const axios = require('axios');

const PROVIDERS = ['gemini', 'openai', 'anthropic'];

/**
 * Obtiene proveedor y API key para una empresa: clave de la empresa o la del servidor.
 * @param {object} empresa - fila empresas (con ai_provider, ai_api_key, gemini_api_key)
 * @param {object} config - config env (gemini, openai, anthropic con apiKey)
 * @returns {{ provider: string, apiKey: string } | null}
 */
function getAiConfig(empresa, config) {
  const provider = (empresa?.ai_provider && String(empresa.ai_provider).trim().toLowerCase()) || 'gemini';
  if (!PROVIDERS.includes(provider)) return null;
  let apiKey = (empresa?.ai_api_key && String(empresa.ai_api_key).trim()) || '';
  if (!apiKey && provider === 'gemini' && empresa?.gemini_api_key && String(empresa.gemini_api_key).trim())
    apiKey = String(empresa.gemini_api_key).trim();
  if (!apiKey && config?.[provider]?.apiKey) apiKey = String(config[provider].apiKey).trim();
  if (!apiKey) return null;
  return { provider, apiKey };
}

/**
 * Genera respuesta de texto usando el proveedor indicado.
 * @param {object} opts - { provider, apiKey, systemPrompt, userMessage, imageParts }
 * @param {object} config - config env para modelos por defecto
 * @returns {Promise<{ text: string, error: string | null }>}
 */
async function generateContent(opts, config = {}) {
  const { provider, apiKey, systemPrompt, userMessage, imageParts = [] } = opts;
  if (!provider || !apiKey) return { text: '', error: 'Proveedor o API key no configurados.' };

  if (provider === 'gemini') return generateGemini(opts, config);
  if (provider === 'openai') return generateOpenAI(opts, config);
  if (provider === 'anthropic') return generateAnthropic(opts, config);
  return { text: '', error: 'Proveedor de IA no soportado.' };
}

async function generateGemini(opts, config) {
  const { apiKey, systemPrompt, userMessage, imageParts } = opts;
  const parts = [{ text: `${systemPrompt}\n\n---\nUsuario: ${userMessage}` }];
  for (const img of imageParts) {
    if (img.mimeType && img.data) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  }
  const modelRaw = config.gemini?.model || 'gemini-2.5-pro';
  let model = String(modelRaw).replace(/^models\//, '').trim() || 'gemini-2.5-pro';
  const fallbacks = ['gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.5-flash'];
  if (!fallbacks.includes(model)) model = fallbacks[0];
  const temperature = Number(config.gemini?.temperature) >= 0 && Number(config.gemini?.temperature) <= 2 ? Number(config.gemini.temperature) : 0.4;
  const topP = Number(config.gemini?.topP) >= 0 && Number(config.gemini?.topP) <= 1 ? Number(config.gemini.topP) : 0.9;
  const generationConfig = {
    temperature,
    topP,
    topK: 40,
    maxOutputTokens: 1024
  };
  const payload = { contents: [{ role: 'user', parts }], generationConfig };
  let data;
  let lastError;
  const modelsToTry = [model, ...fallbacks].filter((m, i, a) => a.indexOf(m) === i);
  for (const m of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });
      data = res.data;
      break;
    } catch (e) {
      lastError = e;
      const msg = (e.response?.data?.error?.message || '').toLowerCase();
      if (!msg.includes('quota') && !msg.includes('not found') && e.response?.status !== 429 && e.response?.status !== 404) throw e;
    }
  }
  if (!data) {
    const rawMsg = lastError?.response?.data?.error?.message || lastError?.message || 'Error IA';
    const isQuota = String(rawMsg).toLowerCase().includes('quota') || lastError?.response?.status === 429;
    const userMsg = isQuota
      ? 'Límite de uso gratuito de la IA alcanzado. Espera 1–2 minutos e intenta de nuevo, o añade facturación en Google AI Studio (ai.google.dev) para más solicitudes.'
      : rawMsg;
    return { text: '', error: userMsg };
  }
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (text && text.trim()) return { text: text.trim(), error: null };
  const finishReason = candidate?.finishReason || candidate?.finish_reason;
  if (finishReason && finishReason !== 'STOP' && finishReason !== 'stop') {
    const reasonMsg = finishReason === 'SAFETY' || finishReason === 'safety' ? 'La IA no generó texto por filtros de seguridad.' : `La IA terminó con motivo: ${finishReason}.`;
    return { text: '', error: reasonMsg };
  }
  return { text: '', error: 'La IA no devolvió texto. Revisa los logs del servidor (pm2 logs) o la consola de Google AI/Cloud por bloqueos o límites.' };
}

async function generateOpenAI(opts, config) {
  const { apiKey, systemPrompt, userMessage, imageParts } = opts;
  const content = [{ type: 'text', text: `${systemPrompt}\n\n---\nUsuario: ${userMessage}` }];
  for (const img of imageParts) {
    if (img.data) content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType || 'image/jpeg'};base64,${img.data}` } });
  }
  const model = config.openai?.model || 'gpt-4o-mini';
  const userContent = content.length === 1 ? content[0].text : content;
  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.7,
    max_tokens: 1024
  };
  try {
    const res = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      timeout: 30000
    });
    const text = res.data?.choices?.[0]?.message?.content;
    return { text: (text && text.trim()) || 'No pude generar una respuesta.', error: null };
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    return { text: '', error: msg || 'Error OpenAI' };
  }
}

async function generateAnthropic(opts, config) {
  const { apiKey, systemPrompt, userMessage, imageParts } = opts;
  const content = [{ type: 'text', text: `${systemPrompt}\n\n---\nUsuario: ${userMessage}` }];
  for (const img of imageParts) {
    if (img.data) content.push({ type: 'image', source: { type: 'base64', media_type: img.mimeType || 'image/jpeg', data: img.data } });
  }
  const model = config.anthropic?.model || 'claude-3-5-haiku-20241022';
  const payload = {
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: content.length === 1 ? content[0].text : content }]
  };
  try {
    const res = await axios.post('https://api.anthropic.com/v1/messages', payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      timeout: 30000
    });
    const text = res.data?.content?.[0]?.text;
    return { text: (text && text.trim()) || 'No pude generar una respuesta.', error: null };
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    return { text: '', error: msg || 'Error Anthropic' };
  }
}

module.exports = { getAiConfig, generateContent, PROVIDERS };
