const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { uploadComprobante } = require('../config/multer');
const { listarPlanes, crearPago, listarMisPagos, listarPendientesAdmin, aprobarPago, rechazarPago } = require('../controllers/pagosController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/planes', authMiddleware, asyncHandler(listarPlanes));
router.get('/', authMiddleware, asyncHandler(listarMisPagos));
router.post('/', authMiddleware, uploadComprobante.single('comprobante'), asyncHandler(crearPago));
router.get('/pendientes', authMiddleware, requireRole('super_admin'), asyncHandler(listarPendientesAdmin));
router.patch('/:id/aprobar', authMiddleware, requireRole('super_admin'), asyncHandler(aprobarPago));
router.patch('/:id/rechazar', authMiddleware, requireRole('super_admin'), asyncHandler(rechazarPago));

module.exports = router;
