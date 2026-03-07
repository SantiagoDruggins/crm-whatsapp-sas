const { listar, getById, crear, actualizar, eliminar, countByEmpresa } = require('../models/contactoModel');

function normalizarTagsBody(val) {
  if (val == null) return [];
  if (Array.isArray(val)) return val.map((t) => String(t).trim()).filter(Boolean);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.map((t) => String(t).trim()).filter(Boolean) : [];
    } catch {
      return val.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
}
const { EVENTOS, dispararWebhooks } = require('../services/webhookService');
const { getLimitsForEmpresa } = require('../models/planModel');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function listarContactos(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const contactos = await listar(empresaId, { limit: Number(req.query.limit) || 50, offset: Number(req.query.offset) || 0 });
    return res.status(200).json({ ok: true, contactos });
  } catch (err) {
    console.error('listarContactos:', err);
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function obtenerContacto(req, res) {
  try {
    const contacto = await getById(req.user.empresaId, req.params.id);
    if (!contacto) return res.status(404).json({ message: 'Contacto no encontrado' });
    return res.status(200).json({ ok: true, contacto });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function crearContacto(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const limits = await getLimitsForEmpresa(empresaId);
    if (limits.max_contactos != null) {
      const total = await countByEmpresa(empresaId);
      if (total >= limits.max_contactos)
        return res.status(402).json({ message: 'Has alcanzado el límite de contactos de tu plan. Actualiza tu plan en Pagos para agregar más.', code: 'LIMITE_CONTACTOS' });
    }
    const { nombre, apellidos, email, telefono, tags, notas } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: 'nombre es requerido' });
    const contacto = await crear(empresaId, { nombre: nombre.trim(), apellidos, email, telefono, tags: normalizarTagsBody(tags), notas });
    // Disparar webhook de nuevo contacto / lead
    dispararWebhooks(empresaId, EVENTOS.NUEVO_CONTACTO, {
      tipo: 'contacto',
      contacto,
    });
    return res.status(201).json({ ok: true, contacto });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarContacto(req, res) {
  try {
    const body = { ...req.body };
    if (body.tags !== undefined) body.tags = normalizarTagsBody(body.tags);
    const contacto = await actualizar(req.user.empresaId, req.params.id, body);
    if (!contacto) return res.status(404).json({ message: 'Contacto no encontrado' });
    return res.status(200).json({ ok: true, contacto });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function eliminarContacto(req, res) {
  try {
    const deleted = await eliminar(req.user.empresaId, req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Contacto no encontrado' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = { listarContactos, obtenerContacto, crearContacto, actualizarContacto, eliminarContacto };
