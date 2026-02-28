const { listar, getById, crear, actualizar } = require('../models/contactoModel');

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
    const { nombre, apellidos, email, telefono, tags, notas } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: 'nombre es requerido' });
    const contacto = await crear(req.user.empresaId, { nombre: nombre.trim(), apellidos, email, telefono, tags: tags || [], notas });
    return res.status(201).json({ ok: true, contacto });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarContacto(req, res) {
  try {
    const contacto = await actualizar(req.user.empresaId, req.params.id, req.body);
    if (!contacto) return res.status(404).json({ message: 'Contacto no encontrado' });
    return res.status(200).json({ ok: true, contacto });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = { listarContactos, obtenerContacto, crearContacto, actualizarContacto };
