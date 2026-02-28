const path = require('path');
const { dirProductos } = require('../config/multer');
const productoModel = require('../models/productoModel');

async function listarProductos(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const productos = await productoModel.listar(empresaId, {
      limit: Number(req.query.limit) || 100,
      offset: Number(req.query.offset) || 0,
    });
    return res.status(200).json({ ok: true, productos });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function obtenerProducto(req, res) {
  try {
    const producto = await productoModel.obtener(req.user.empresaId, req.params.id);
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
    return res.status(200).json({ ok: true, producto });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function crearProducto(req, res) {
  try {
    const { nombre, descripcion, precio, moneda, tipo, imagen_url, tags, activo } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ message: 'nombre es requerido' });
    const producto = await productoModel.crear(req.user.empresaId, {
      nombre: nombre.trim(),
      descripcion,
      precio,
      moneda,
      tipo,
      imagen_url,
      tags,
      activo,
    });
    return res.status(201).json({ ok: true, producto });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function actualizarProducto(req, res) {
  try {
    const producto = await productoModel.actualizar(req.user.empresaId, req.params.id, req.body);
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
    return res.status(200).json({ ok: true, producto });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function eliminarProducto(req, res) {
  try {
    const producto = await productoModel.desactivar(req.user.empresaId, req.params.id);
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
    return res.status(200).json({ ok: true, producto });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

async function subirImagenProducto(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Imagen es requerida' });
    const empresaId = req.user.empresaId;
    const ruta = `/uploads/productos/${req.file.filename}`;
    const producto = await productoModel.actualizar(empresaId, req.params.id, { imagen_url: ruta });
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
    return res.status(200).json({ ok: true, producto, imagen_url: ruta });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

module.exports = { listarProductos, obtenerProducto, crearProducto, actualizarProducto, eliminarProducto, subirImagenProducto };

