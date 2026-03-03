const webhookModel = require('../models/webhookModel');

async function listarWebhooks(req, res) {
  try {
    const empresaId = req.user.empresaId;
    const hooks = await webhookModel.listarPorEmpresa(empresaId, {
      limit: Number(req.query.limit) || 100,
      offset: Number(req.query.offset) || 0,
    });
    return res.status(200).json({ ok: true, webhooks: hooks });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function crearWebhook(req, res) {
  try {
    const empresaId = req.user.empresaId;
    const { nombre, evento, url, headers, activo } = req.body || {};
    if (!nombre || !nombre.trim()) return res.status(400).json({ message: 'nombre es requerido' });
    if (!evento || !evento.trim()) return res.status(400).json({ message: 'evento es requerido' });
    if (!url || !url.trim()) return res.status(400).json({ message: 'url es requerida' });
    const hook = await webhookModel.crear(empresaId, {
      nombre: nombre.trim(),
      evento: evento.trim(),
      url: url.trim(),
      headers: headers || {},
      activo: activo !== undefined ? !!activo : true,
    });
    return res.status(201).json({ ok: true, webhook: hook });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarWebhook(req, res) {
  try {
    const empresaId = req.user.empresaId;
    const id = req.params.id;
    const hook = await webhookModel.actualizar(empresaId, id, req.body || {});
    if (!hook) return res.status(404).json({ message: 'Webhook no encontrado' });
    return res.status(200).json({ ok: true, webhook: hook });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function eliminarWebhook(req, res) {
  try {
    const empresaId = req.user.empresaId;
    const id = req.params.id;
    const deleted = await webhookModel.eliminar(empresaId, id);
    if (!deleted) return res.status(404).json({ message: 'Webhook no encontrado' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = {
  listarWebhooks,
  crearWebhook,
  actualizarWebhook,
  eliminarWebhook,
};

