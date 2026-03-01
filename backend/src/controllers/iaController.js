const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const { query } = require('../config/db');
const { dirBotConocimiento } = require('../config/multer');
const { getAiConfig, generateContent } = require('../services/aiProviderService');
const contactoModel = require('../models/contactoModel');

/** Genera respuesta del bot por empresa y mensaje (para webhook WhatsApp, etc.). opts: { contactId, conversacionId } para memoria. Retorna { respuesta?, error? }. */
async function generarRespuestaBot(empresaId, mensaje, opts = {}) {
  if (!mensaje?.trim()) return { error: 'mensaje vacío' };
  try {
    let empresa = null;
    let bot = null;
    let catalogo = [];
    try {
      const empRes = await query(`SELECT * FROM empresas WHERE id = $1`, [empresaId]);
      empresa = empRes.rows[0] || null;
      const botRes = await query(`SELECT prompt_base, conocimiento FROM bots WHERE empresa_id = $1 AND estado = 'activo' ORDER BY created_at DESC LIMIT 1`, [empresaId]);
      bot = botRes.rows[0] || null;
      const catRes = await query(
        `SELECT nombre, descripcion, precio, moneda, tipo, imagen_url
         FROM productos
         WHERE empresa_id = $1 AND activo = true
         ORDER BY nombre ASC
         LIMIT 100`,
        [empresaId]
      );
      catalogo = catRes.rows || [];
    } catch (e) {}
    const aiConfig = getAiConfig(empresa, config);
    if (!aiConfig) return { respuesta: '', error: 'Configura una clave de IA en Integraciones o usa la incluida en tu plan.' };
    let systemPrompt = 'Eres un asistente amable y profesional. Responde en el mismo idioma que el usuario.';
    if (bot?.prompt_base) {
      systemPrompt = bot.prompt_base;
      const conocimiento = Array.isArray(bot.conocimiento) ? bot.conocimiento : [];
      const textos = conocimiento.filter((c) => c.tipo === 'texto' && c.contenido).map((c) => c.contenido);
      if (textos.length) systemPrompt += '\n\nInformación de referencia que puedes usar:\n' + textos.join('\n\n');
    }
    if (catalogo.length) {
      const resumen = catalogo
        .map(
          (p, idx) =>
            `${idx + 1}. (${p.tipo || 'producto'}) ${p.nombre} – ${Number(p.precio || 0).toLocaleString('es-CO')} ${p.moneda || 'COP'}${
              p.descripcion ? `\n   ${p.descripcion}` : ''
            }${p.imagen_url ? `\n   Imagen: ${p.imagen_url}` : ''}`
        )
        .join('\n\n');
      systemPrompt +=
        '\n\nCATÁLOGO DE PRODUCTOS/SERVICIOS (NO INVENTES OTROS):\n' +
        resumen +
        '\n\nSi el usuario pregunta por precios, productos o servicios, usa SOLO este catálogo. Si algo no está en la lista, dilo claramente.';
    }
    if (opts.contactId) {
      try {
        const ctx = await contactoModel.getContactContext(empresaId, opts.contactId, { mensajesLimit: 30 });
        if (ctx) {
          const nombreContacto = [ctx.contact.nombre, ctx.contact.apellidos].filter(Boolean).join(' ').trim() || ctx.contact.telefono || 'Cliente';
          let bloque = '\n\n--- CONTEXTO DE ESTE CLIENTE (memoria CRM) ---\n';
          bloque += `Nombre: ${nombreContacto}. Teléfono: ${ctx.contact.telefono || 'N/A'}. Lead: ${ctx.leadStatus}.`;
          if (ctx.tags && ctx.tags.length) bloque += ` Tags: ${ctx.tags.map((t) => t.name).join(', ')}.`;
          if (ctx.conversationState?.current_state) bloque += ` Estado conversación: ${ctx.conversationState.current_state}.`;
          if (ctx.appointments && ctx.appointments.length) {
            bloque += ` Próximas citas: ${ctx.appointments.map((a) => `${a.date}${a.time ? ' ' + a.time : ''} (${a.status})`).join('; ')}.`;
          }
          if (ctx.lastMessages && ctx.lastMessages.length) {
            bloque += '\nÚltimos mensajes (para mantener contexto):\n';
            ctx.lastMessages.forEach((m) => {
              bloque += (m.role === 'user' ? 'Usuario: ' : 'Asistente: ') + (m.content || '').slice(0, 500) + '\n';
            });
          }
          bloque += '--- FIN CONTEXTO ---';
          systemPrompt += bloque;
        }
      } catch (e) {
        // Si falla contexto (ej. migración no aplicada), seguir sin memoria
      }
    }
    const conocimiento = Array.isArray(bot?.conocimiento) ? bot.conocimiento : [];
    const imagenesConocimiento = conocimiento.filter((c) => c.tipo === 'imagen' && c.ruta).slice(0, 4);
    const nombreEmpresa = empresa?.nombre || 'la empresa';
    const contactoWhatsApp = empresa?.telefono_whatsapp?.trim() ? `por WhatsApp al ${empresa.telefono_whatsapp.trim()}` : 'por WhatsApp en esta misma conversación';
    systemPrompt =
      systemPrompt
        .replace(/\[NOMBRE_EMPRESA\]/gi, nombreEmpresa)
        .replace(/\[CONTACTO\]/gi, contactoWhatsApp)
        .replace(/\[DIRECCION\]/gi, 'consultar con nosotros')
        .replace(/\[HORARIOS\]/gi, 'consultar con nosotros')
        .replace(/\[PRODUCTOS_SERVICIOS\]/gi, 'nuestros productos y servicios') +
      '\n\nIMPORTANTE: El usuario te escribe por WhatsApp. Cuando pida contacto, comprar o más información, indícale que puede seguir escribiendo por WhatsApp en esta conversación. No sugieras enviar email ni Gmail.';
    const imageParts = [];
    for (const item of imagenesConocimiento) {
      const baseName = path.basename(item.ruta);
      const filePath = path.join(dirBotConocimiento, baseName);
      try {
        if (fs.existsSync(filePath)) {
          const buf = fs.readFileSync(filePath);
          const ext = path.extname(baseName).toLowerCase();
          const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          imageParts.push({ mimeType: mime, data: buf.toString('base64') });
        }
      } catch (e) {}
    }
    const result = await generateContent(
      { provider: aiConfig.provider, apiKey: aiConfig.apiKey, systemPrompt, userMessage: mensaje.trim(), imageParts },
      config
    );
    return { respuesta: result.text || '', error: result.error };
  } catch (err) {
    return { respuesta: '', error: err.message || 'Error al conectar con la IA.' };
  }
}

async function responder(req, res) {
  try {
    const { mensaje } = req.body;
    if (!mensaje?.trim()) return res.status(400).json({ message: 'mensaje es requerido' });

    const empresaId = req.user.empresaId;
    let empresa = null;
    try {
      const empRes = await query(`SELECT * FROM empresas WHERE id = $1`, [empresaId]);
      empresa = empRes.rows[0] || null;
    } catch (e) {}
    const aiConfig = getAiConfig(empresa, config);
    if (!aiConfig) {
      return res.status(200).json({ ok: true, respuesta: 'Configura una clave de IA en Integraciones o usa la incluida en tu plan.', error: null, logId: null });
    }
    let systemPrompt = 'Eres un asistente amable y profesional. Responde en el mismo idioma que el usuario.';
    let bot = null;
    try {
      const botRes = await query(`SELECT prompt_base, conocimiento FROM bots WHERE empresa_id = $1 AND estado = 'activo' ORDER BY created_at DESC LIMIT 1`, [empresaId]);
      bot = botRes.rows[0] || null;
      if (bot?.prompt_base) {
        systemPrompt = bot.prompt_base;
        const conocimiento = Array.isArray(bot.conocimiento) ? bot.conocimiento : [];
        const textos = conocimiento.filter((c) => c.tipo === 'texto' && c.contenido).map((c) => c.contenido);
        if (textos.length) systemPrompt += '\n\nInformación de referencia que puedes usar:\n' + textos.join('\n\n');
      }
    } catch (e) {}

    const conocimiento = Array.isArray(bot?.conocimiento) ? bot.conocimiento : [];
    const imagenesConocimiento = conocimiento.filter((c) => c.tipo === 'imagen' && c.ruta).slice(0, 4);
    const nombreEmpresa = empresa?.nombre || 'la empresa';
    const contactoWhatsApp = empresa?.telefono_whatsapp?.trim()
      ? `por WhatsApp al ${empresa.telefono_whatsapp.trim()}`
      : 'por WhatsApp en esta misma conversación';
    systemPrompt =
      systemPrompt
        .replace(/\[NOMBRE_EMPRESA\]/gi, nombreEmpresa)
        .replace(/\[CONTACTO\]/gi, contactoWhatsApp)
        .replace(/\[DIRECCION\]/gi, 'consultar con nosotros')
        .replace(/\[HORARIOS\]/gi, 'consultar con nosotros')
        .replace(/\[PRODUCTOS_SERVICIOS\]/gi, 'nuestros productos y servicios') +
      '\n\nIMPORTANTE: El usuario te escribe por WhatsApp. Cuando pida contacto, comprar o más información, indícale que puede seguir escribiendo por WhatsApp en esta conversación. No sugieras enviar email ni Gmail.';

    const imageParts = [];
    for (const item of imagenesConocimiento) {
      const baseName = path.basename(item.ruta);
      const filePath = path.join(dirBotConocimiento, baseName);
      try {
        if (fs.existsSync(filePath)) {
          const buf = fs.readFileSync(filePath);
          const ext = path.extname(baseName).toLowerCase();
          const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          imageParts.push({ mimeType: mime, data: buf.toString('base64') });
        }
      } catch (e) { /* ignorar imagen si falla lectura */ }
    }
    const result = await generateContent(
      { provider: aiConfig.provider, apiKey: aiConfig.apiKey, systemPrompt, userMessage: mensaje.trim(), imageParts },
      config
    );
    if (result.error) {
      console.error('IA responder:', result.error);
      return res.status(200).json({ ok: true, respuesta: '', error: result.error, logId: null });
    }
    return res.status(200).json({ ok: true, respuesta: result.text || 'No pude generar una respuesta.', error: null, logId: null });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error('IA responder:', err.response?.data || err);
    return res.status(200).json({ ok: true, respuesta: '', error: msg || 'Error al conectar con la IA.', logId: null });
  }
}

async function listarBots(req, res) {
  try {
    const result = await query(`SELECT id, empresa_id, nombre, descripcion, prompt_base, canal, estado, tipo, conocimiento, created_at, updated_at FROM bots WHERE empresa_id = $1 ORDER BY created_at DESC`, [req.user.empresaId]);
    return res.status(200).json({ ok: true, bots: result.rows || [] });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function crearBot(req, res) {
  try {
    const { nombre, descripcion, prompt_base, canal, tipo, conocimiento } = req.body;
    if (!prompt_base?.trim()) return res.status(400).json({ message: 'prompt_base es requerido' });
    const conocimientoJson = Array.isArray(conocimiento) ? JSON.stringify(conocimiento) : '[]';
    const result = await query(
      `INSERT INTO bots (empresa_id, nombre, descripcion, prompt_base, canal, estado, tipo, conocimiento) VALUES ($1, $2, $3, $4, $5, 'activo', $6, $7::jsonb) RETURNING *`,
      [req.user.empresaId, nombre || 'Bot', descripcion || null, prompt_base.trim(), canal || 'whatsapp', tipo || 'general', conocimientoJson]
    );
    return res.status(201).json({ ok: true, bot: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function obtenerBot(req, res) {
  try {
    const result = await query(`SELECT * FROM bots WHERE id = $1 AND empresa_id = $2`, [req.params.id, req.user.empresaId]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Bot no encontrado' });
    return res.status(200).json({ ok: true, bot: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarBot(req, res) {
  try {
    const { nombre, descripcion, prompt_base, estado, tipo, conocimiento } = req.body;
    const conocimientoJson = conocimiento !== undefined && Array.isArray(conocimiento) ? JSON.stringify(conocimiento) : null;
    const result = await query(
      `UPDATE bots SET nombre = COALESCE($2, nombre), descripcion = COALESCE($3, descripcion), prompt_base = COALESCE($4, prompt_base), estado = COALESCE($5, estado), tipo = COALESCE($6, tipo), conocimiento = COALESCE($7::jsonb, conocimiento), updated_at = now() WHERE id = $1 AND empresa_id = $8 RETURNING *`,
      [req.params.id, nombre, descripcion, prompt_base, estado, tipo, conocimientoJson, req.user.empresaId]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Bot no encontrado' });
    return res.status(200).json({ ok: true, bot: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function eliminarBot(req, res) {
  try {
    const result = await query(`DELETE FROM bots WHERE id = $1 AND empresa_id = $2 RETURNING id`, [req.params.id, req.user.empresaId]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Bot no encontrado' });
    return res.status(200).json({ ok: true, message: 'Bot eliminado' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function subirArchivoConocimiento(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Archivo es requerido' });
    const ruta = `/uploads/bot-conocimiento/${req.file.filename}`;
    const nombre = req.body.nombre || req.file.originalname || req.file.filename;
    const result = await query(`SELECT conocimiento FROM bots WHERE id = $1 AND empresa_id = $2`, [req.params.id, req.user.empresaId]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Bot no encontrado' });
    const conocimiento = Array.isArray(result.rows[0].conocimiento) ? result.rows[0].conocimiento : [];
    const mimetype = (req.file.mimetype || '').toLowerCase();
    const isImage = mimetype.startsWith('image/');
    const isPdf = mimetype === 'application/pdf' || (req.file.originalname || '').toLowerCase().endsWith('.pdf');
    const isTxt = mimetype.includes('text/plain') || (req.file.originalname || '').toLowerCase().endsWith('.txt');

    if (isImage) {
      conocimiento.push({ tipo: 'imagen', nombre, ruta });
    } else {
      conocimiento.push({ tipo: 'archivo', nombre, ruta });
    }

    if (isPdf && req.file.path) {
      try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(req.file.path);
        const { text } = await pdfParse(dataBuffer);
        const texto = (text && text.trim()) ? text.trim().slice(0, 100000) : '';
        if (texto) conocimiento.push({ tipo: 'texto', contenido: `[Contenido del PDF "${nombre}"]:\n${texto}`, nombre: `PDF: ${nombre}` });
      } catch (e) { /* si falla la extracción solo queda el archivo */ }
    } else if (isTxt && req.file.path) {
      try {
        const texto = fs.readFileSync(req.file.path, 'utf8').trim().slice(0, 100000);
        if (texto) conocimiento.push({ tipo: 'texto', contenido: `[Contenido del archivo "${nombre}"]:\n${texto}`, nombre: `TXT: ${nombre}` });
      } catch (e) { /* si falla la lectura solo queda el archivo */ }
    }

    await query(`UPDATE bots SET conocimiento = $2::jsonb, updated_at = now() WHERE id = $1 AND empresa_id = $3`, [req.params.id, JSON.stringify(conocimiento), req.user.empresaId]);
    return res.status(200).json({ ok: true, ruta, nombre, conocimiento });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = { responder, generarRespuestaBot, listarBots, crearBot, obtenerBot, actualizarBot, eliminarBot, subirArchivoConocimiento };
