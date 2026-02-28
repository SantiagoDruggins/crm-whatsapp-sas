const tagModel = require('../models/tagModel');
const contactoModel = require('../models/contactoModel');

async function listarTags(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const tags = await tagModel.listar(empresaId, { limit: Number(req.query.limit) || 100, offset: Number(req.query.offset) || 0 });
    return res.status(200).json({ ok: true, tags });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function obtenerTag(req, res) {
  try {
    const tag = await tagModel.getById(req.user.empresaId, req.params.id);
    if (!tag) return res.status(404).json({ message: 'Tag no encontrado' });
    return res.status(200).json({ ok: true, tag });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function crearTag(req, res) {
  try {
    const { name, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'name es requerido' });
    const tag = await tagModel.crear(req.user.empresaId, { name: name.trim(), color });
    return res.status(201).json({ ok: true, tag });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarTag(req, res) {
  try {
    const tag = await tagModel.actualizar(req.user.empresaId, req.params.id, req.body);
    if (!tag) return res.status(404).json({ message: 'Tag no encontrado' });
    return res.status(200).json({ ok: true, tag });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function eliminarTag(req, res) {
  try {
    const deleted = await tagModel.eliminar(req.user.empresaId, req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Tag no encontrado' });
    return res.status(200).json({ ok: true, message: 'Tag eliminado' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function listarTagsContacto(req, res) {
  try {
    const contacto = await contactoModel.getById(req.user.empresaId, req.params.id);
    if (!contacto) return res.status(404).json({ message: 'Contacto no encontrado' });
    const tags = await tagModel.getByContact(req.user.empresaId, req.params.id);
    return res.status(200).json({ ok: true, tags });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarTagsContacto(req, res) {
  try {
    const contacto = await contactoModel.getById(req.user.empresaId, req.params.id);
    if (!contacto) return res.status(404).json({ message: 'Contacto no encontrado' });
    const { tagIds } = req.body;
    const tags = await tagModel.setContactTags(req.user.empresaId, req.params.id, Array.isArray(tagIds) ? tagIds : []);
    return res.status(200).json({ ok: true, tags });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = {
  listarTags,
  obtenerTag,
  crearTag,
  actualizarTag,
  eliminarTag,
  listarTagsContacto,
  actualizarTagsContacto,
};
