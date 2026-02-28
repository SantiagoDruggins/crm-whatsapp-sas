const path = require('path');
const { crear, listarPorEmpresa, listarPendientes, aprobar, rechazar } = require('../models/pagoModel');
const { actualizarEstadoEmpresa } = require('../models/empresaModel');
const { listarActivos } = require('../models/planModel');

async function listarPlanes(req, res) {
  try {
    const planes = await listarActivos();
    return res.status(200).json({ ok: true, planes });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function crearPago(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const file = req.file;
    if (!file?.path) return res.status(400).json({ message: 'Debes subir una imagen del comprobante' });
    const { plan, monto, referencia } = req.body;
    if (!plan?.trim()) return res.status(400).json({ message: 'plan es requerido' });
    const montoNum = Number(monto);
    if (Number.isNaN(montoNum) || montoNum < 0) return res.status(400).json({ message: 'monto inválido' });
    const comprobanteUrl = '/uploads/comprobantes/' + path.basename(file.path);
    const pago = await crear(empresaId, { plan: plan.trim(), monto: montoNum, comprobanteUrl, referencia: referencia?.trim() || null });
    await actualizarEstadoEmpresa(empresaId, { estado: 'pago_en_revision' });
    return res.status(201).json({ ok: true, pago, message: 'Pago enviado a revisión' });
  } catch (err) {
    console.error('crearPago:', err);
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function listarMisPagos(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const pagos = await listarPorEmpresa(empresaId, { limit: Number(req.query.limit) || 20, offset: Number(req.query.offset) || 0 });
    return res.status(200).json({ ok: true, pagos });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function listarPendientesAdmin(req, res) {
  try {
    const pagos = await listarPendientes({ limit: Number(req.query.limit) || 50, offset: Number(req.query.offset) || 0 });
    return res.status(200).json({ ok: true, pagos });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function aprobarPago(req, res) {
  try {
    const pago = await aprobar(req.params.id, req.user.id);
    if (!pago) return res.status(404).json({ message: 'Pago no encontrado o ya procesado' });
    return res.status(200).json({ ok: true, pago, message: 'Pago aprobado' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function rechazarPago(req, res) {
  try {
    const pago = await rechazar(req.params.id, req.user.id, req.body.observaciones);
    if (!pago) return res.status(404).json({ message: 'Pago no encontrado o ya procesado' });
    return res.status(200).json({ ok: true, pago, message: 'Pago rechazado' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = { listarPlanes, crearPago, listarMisPagos, listarPendientesAdmin, aprobarPago, rechazarPago };
