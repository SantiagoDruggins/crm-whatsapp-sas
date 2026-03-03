const flowModel = require('../models/flowModel');

async function listarFlows(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const flows = await flowModel.listarPorEmpresa(empresaId, {
      limit: Number(req.query.limit) || 100,
      offset: Number(req.query.offset) || 0,
    });
    return res.status(200).json({ ok: true, flows });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function obtenerFlow(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const flow = await flowModel.getById(empresaId, req.params.id);
    if (!flow) return res.status(404).json({ message: 'Flujo no encontrado' });
    return res.status(200).json({ ok: true, flow });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function crearFlow(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const { nombre, trigger_type, trigger_value, accion_tipo, accion_valor, activo } = req.body || {};
    if (!nombre || !trigger_type || !trigger_value || !accion_tipo || !accion_valor) {
      return res.status(400).json({ message: 'nombre, trigger_type, trigger_value, accion_tipo y accion_valor son requeridos' });
    }
    const flow = await flowModel.crear(empresaId, {
      nombre: String(nombre).trim(),
      trigger_type: String(trigger_type).trim(),
      trigger_value: String(trigger_value).trim(),
      accion_tipo: String(accion_tipo).trim(),
      accion_valor: String(accion_valor),
      activo: activo !== undefined ? !!activo : true,
    });
    return res.status(201).json({ ok: true, flow });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarFlow(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const data = {};
    ['nombre', 'trigger_type', 'trigger_value', 'accion_tipo', 'accion_valor', 'activo'].forEach((k) => {
      if (req.body[k] !== undefined) data[k] = k === 'activo' ? !!req.body[k] : req.body[k];
    });
    const flow = await flowModel.actualizar(empresaId, req.params.id, data);
    if (!flow) return res.status(404).json({ message: 'Flujo no encontrado' });
    return res.status(200).json({ ok: true, flow });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function eliminarFlow(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const deleted = await flowModel.eliminar(empresaId, req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Flujo no encontrado' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = {
  listarFlows,
  obtenerFlow,
  crearFlow,
  actualizarFlow,
  eliminarFlow,
};

