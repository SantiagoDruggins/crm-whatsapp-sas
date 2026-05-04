const productoModel = require('../models/productoModel');

function parseMediaBody(value) {
  if (Array.isArray(value)) return value;
  if (!value) return undefined;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch (_) {
      return undefined;
    }
  }
  return undefined;
}

async function listarProductos(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const productos = await productoModel.listarActivos(empresaId, {
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
    const media = parseMediaBody(req.body.media);
    const producto = await productoModel.crear(req.user.empresaId, {
      nombre: nombre.trim(),
      descripcion,
      precio,
      moneda,
      tipo,
      imagen_url,
      media,
      tags,
      activo,
    });
    return res.status(201).json({ ok: true, producto });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Error' });
  }
}

async function actualizarProducto(req, res) {
  try {
    const body = { ...req.body };
    if (body.media !== undefined) body.media = parseMediaBody(body.media);
    const producto = await productoModel.actualizar(req.user.empresaId, req.params.id, body);
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
    return res.status(200).json({ ok: true, producto });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Error' });
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
    const productoPrevio = await productoModel.obtener(empresaId, req.params.id);
    if (!productoPrevio) return res.status(404).json({ message: 'Producto no encontrado' });
    const mediaActual = Array.isArray(productoPrevio.media) ? productoPrevio.media : [];
    const tipo = (req.file.mimetype || '').toLowerCase().startsWith('video/') ? 'video' : 'image';
    const media = [
      ...mediaActual.map((m) => ({
        type: m.type,
        url: m.url,
        is_primary: !!m.is_primary,
        order_index: Number(m.order_index) || 0,
      })),
      {
        type: tipo,
        url: ruta,
        is_primary: mediaActual.length === 0 && tipo === 'image',
        order_index: mediaActual.length,
      },
    ];
    const producto = await productoModel.actualizar(empresaId, req.params.id, { imagen_url: ruta, media });
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
    return res.status(200).json({ ok: true, producto, imagen_url: ruta, media_url: ruta, type: tipo });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Error' });
  }
}

async function subirMediaProducto(req, res) {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) return res.status(400).json({ message: 'Archivo multimedia requerido' });
    const empresaId = req.user.empresaId;
    const producto = await productoModel.obtener(empresaId, req.params.id);
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
    const actuales = Array.isArray(producto.media) ? producto.media : [];
    const nuevos = files.map((file, idx) => {
      const tipo = (file.mimetype || '').toLowerCase().startsWith('video/') ? 'video' : 'image';
      return {
        type: tipo,
        url: `/uploads/productos/${file.filename}`,
        is_primary: actuales.length === 0 && idx === 0 && tipo === 'image',
        order_index: actuales.length + idx,
      };
    });
    const actualizado = await productoModel.actualizar(empresaId, req.params.id, {
      media: [
        ...actuales.map((m) => ({
          type: m.type,
          url: m.url,
          is_primary: !!m.is_primary,
          order_index: Number(m.order_index) || 0,
        })),
        ...nuevos,
      ],
    });
    return res.status(200).json({ ok: true, producto: actualizado, media: nuevos });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Error' });
  }
}

async function subirMediaTemporalProducto(req, res) {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) return res.status(400).json({ message: 'Archivo multimedia requerido' });
    const media = files.map((file, idx) => ({
      type: (file.mimetype || '').toLowerCase().startsWith('video/') ? 'video' : 'image',
      url: `/uploads/productos/${file.filename}`,
      is_primary: idx === 0 && !(file.mimetype || '').toLowerCase().startsWith('video/'),
      order_index: idx,
    }));
    return res.status(200).json({ ok: true, media });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Error' });
  }
}

module.exports = { listarProductos, obtenerProducto, crearProducto, actualizarProducto, eliminarProducto, subirImagenProducto, subirMediaProducto, subirMediaTemporalProducto };

