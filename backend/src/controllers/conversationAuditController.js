const config = require('../config/env');
const auditModel = require('../models/conversationAuditModel');
const conversacionModel = require('../models/conversacionModel');
const mensajeModel = require('../models/mensajeModel');
const pedidoModel = require('../models/pedidoModel');
const contactoModel = require('../models/contactoModel');
const { obtenerEmpresaPorId } = require('../models/empresaModel');
const { getAiConfig, generateContent } = require('../services/aiProviderService');

function extractJson(text) {
  const raw = String(text || '').trim();
  const clean = raw.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(clean);
  } catch (_) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (_) {}
    }
  }
  return null;
}

function normalizeResultado(data) {
  return {
    intencion_compra: !!data?.intencion_compra,
    datos_completos: !!data?.datos_completos,
    pedido_confirmado: !!data?.pedido_confirmado,
    probabilidad_cierre: Math.max(0, Math.min(100, Number(data?.probabilidad_cierre) || 0)),
  };
}

async function listarAuditorias(req, res) {
  try {
    const auditorias = await auditModel.listar(req.user.empresaId, {
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    });
    return res.status(200).json({ ok: true, auditorias });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function auditarConversacion(req, res) {
  try {
    const empresaId = req.user.empresaId;
    const conversacionId = req.params.id;
    const conversacion = await conversacionModel.getById(empresaId, conversacionId);
    if (!conversacion) return res.status(404).json({ message: 'Conversacion no encontrada' });

    const mensajes = await mensajeModel.listarUltimosPorConversacion(empresaId, conversacionId, 60);
    const transcript = (mensajes || [])
      .map((m) => `${m.es_entrada ? 'Cliente' : m.origen === 'bot' ? 'Bot' : 'Vendedor'}: ${m.contenido || ''}`)
      .join('\n')
      .slice(-12000);

    const empresa = await obtenerEmpresaPorId(empresaId);
    const aiCfg = getAiConfig(empresa, config);
    if (!aiCfg?.apiKey) return res.status(400).json({ message: 'IA no configurada para esta empresa' });

    const prompt =
      'Analiza esta conversación de ventas.\n\n' +
      'Detecta:\n\n' +
      '1. intención de compra\n' +
      '2. si el cliente dio datos (nombre, dirección, ciudad, teléfono)\n' +
      '3. si el vendedor confirmó el pedido\n' +
      '4. probabilidad de cierre (0-100)\n\n' +
      'Responde en JSON:\n' +
      '{\n' +
      '"intencion_compra": boolean,\n' +
      '"datos_completos": boolean,\n' +
      '"pedido_confirmado": boolean,\n' +
      '"probabilidad_cierre": number\n' +
      '}';

    const ai = await generateContent(
      { provider: aiCfg.provider, apiKey: aiCfg.apiKey, systemPrompt: prompt, userMessage: transcript },
      { ...config, gemini: { ...(config.gemini || {}), model: empresa?.ai_model_router || 'gemini-2.5-flash', temperature: 0, maxOutputTokens: 512 } }
    );
    if (ai.error) return res.status(502).json({ message: ai.error });
    const parsed = extractJson(ai.text);
    if (!parsed) return res.status(502).json({ message: 'La IA no devolvio JSON valido' });

    const resultado = normalizeResultado(parsed);
    const existePedido = await pedidoModel.existePorConversacion(empresaId, conversacionId);
    const alertaGenerada = resultado.intencion_compra && !existePedido;
    const audit = await auditModel.crear(empresaId, {
      chat_id: String(conversacionId),
      conversacion_id: conversacionId,
      contacto_id: conversacion.contacto_id || null,
      resultado_ia: resultado,
      alerta_generada: alertaGenerada,
      pedido_creado: existePedido,
    });
    return res.status(201).json({ ok: true, auditoria: audit, existePedido });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function crearPedidoDesdeAuditoria(req, res) {
  try {
    const empresaId = req.user.empresaId;
    const audit = await auditModel.obtener(empresaId, req.params.id);
    if (!audit) return res.status(404).json({ message: 'Auditoria no encontrada' });
    if (audit.pedido_creado) return res.status(400).json({ message: 'Esta auditoria ya tiene pedido creado' });
    if (!audit.resultado_ia?.datos_completos) {
      return res.status(400).json({ message: 'La IA no marco datos completos; crea el pedido manualmente' });
    }
    const conversacion = audit.conversacion_id ? await conversacionModel.getById(empresaId, audit.conversacion_id) : null;
    const contacto = conversacion?.contacto_id ? await contactoModel.getById(empresaId, conversacion.contacto_id).catch(() => null) : null;
    const pedido = await pedidoModel.crear(empresaId, {
      contacto_id: audit.contacto_id || conversacion?.contacto_id || null,
      conversacion_id: audit.conversacion_id || null,
      estado: 'pendiente',
      total: Number(req.body?.total) || 0,
      datos: {
        origen: 'auditoria_ia',
        audit_id: audit.id,
        resultado_ia: audit.resultado_ia,
      },
      direccion: {
        nombre: contacto?.nombre || '',
        telefono: contacto?.telefono || conversacion?.contacto_telefono || '',
      },
    });
    await auditModel.marcarPedidoCreado(empresaId, audit.id);
    const actualizado = await pedidoModel.getById(empresaId, pedido.id);
    return res.status(201).json({ ok: true, pedido: actualizado });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = { listarAuditorias, auditarConversacion, crearPedidoDesdeAuditoria };
