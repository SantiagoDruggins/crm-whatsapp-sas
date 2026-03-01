const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const empresaEstadoMiddleware = require('../middleware/empresaEstadoMiddleware');
const { listarContactos, obtenerContacto, crearContacto, actualizarContacto } = require('../controllers/contactosController');
const { listarConversaciones, obtenerConversacion, actualizarConversacion, historialConversacion, enviarMensajeConversacion } = require('../controllers/conversacionesController');
const { listarProductos, obtenerProducto, crearProducto, actualizarProducto, eliminarProducto, subirImagenProducto } = require('../controllers/productosController');
const { listarTags, obtenerTag, crearTag, actualizarTag, eliminarTag, listarTagsContacto, actualizarTagsContacto } = require('../controllers/tagsController');
const { listarAppointments, obtenerAppointment, crearAppointment, actualizarAppointment, eliminarAppointment, listarAppointmentsContacto } = require('../controllers/appointmentsController');
const { actividadReciente } = require('../controllers/activityController');
const { uploadProductoImagen } = require('../config/multer');
const { query } = require('../config/db');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(authMiddleware);
router.use(empresaEstadoMiddleware);

async function listarUsuariosEmpresa(req, res) {
  try {
    const empresaId = req.user.empresaId;
    if (!empresaId) return res.status(400).json({ message: 'Empresa no asociada' });
    const result = await query(`SELECT id, nombre, email, rol FROM usuarios WHERE empresa_id = $1 AND is_active = true ORDER BY nombre`, [empresaId]);
    return res.status(200).json({ ok: true, usuarios: result.rows });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Error' });
  }
}

router.get('/usuarios', asyncHandler(listarUsuariosEmpresa));
router.get('/contactos', asyncHandler(listarContactos));
router.get('/contactos/:id', asyncHandler(obtenerContacto));
router.post('/contactos', asyncHandler(crearContacto));
router.patch('/contactos/:id', asyncHandler(actualizarContacto));
router.get('/conversaciones', asyncHandler(listarConversaciones));
router.get('/conversaciones/:id', asyncHandler(obtenerConversacion));
router.patch('/conversaciones/:id', asyncHandler(actualizarConversacion));
router.get('/conversaciones/:id/historial', asyncHandler(historialConversacion));
router.post('/conversaciones/:id/mensajes', asyncHandler(enviarMensajeConversacion));
router.get('/actividad-reciente', asyncHandler(actividadReciente));

// Tags
router.get('/tags', asyncHandler(listarTags));
router.post('/tags', asyncHandler(crearTag));
router.get('/tags/:id', asyncHandler(obtenerTag));
router.patch('/tags/:id', asyncHandler(actualizarTag));
router.delete('/tags/:id', asyncHandler(eliminarTag));
router.get('/contactos/:id/tags', asyncHandler(listarTagsContacto));
router.put('/contactos/:id/tags', asyncHandler(actualizarTagsContacto));

// Agenda / Citas
router.get('/appointments', asyncHandler(listarAppointments));
router.post('/appointments', asyncHandler(crearAppointment));
router.get('/appointments/:id', asyncHandler(obtenerAppointment));
router.patch('/appointments/:id', asyncHandler(actualizarAppointment));
router.delete('/appointments/:id', asyncHandler(eliminarAppointment));
router.get('/contactos/:id/appointments', asyncHandler(listarAppointmentsContacto));

// Catálogo de productos / servicios
router.get('/productos', asyncHandler(listarProductos));
router.get('/productos/:id', asyncHandler(obtenerProducto));
router.post('/productos', asyncHandler(crearProducto));
router.patch('/productos/:id', asyncHandler(actualizarProducto));
router.delete('/productos/:id', asyncHandler(eliminarProducto));
router.post('/productos/:id/imagen', uploadProductoImagen.single('imagen'), asyncHandler(subirImagenProducto));

module.exports = router;
