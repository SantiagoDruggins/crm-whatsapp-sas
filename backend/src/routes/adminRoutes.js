const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { listarEmpresasAdmin, metricasAdmin, actualizarEstadoEmpresaAdmin, actualizarPlanEmpresaAdmin } = require('../controllers/adminController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(authMiddleware);
router.use(requireRole('super_admin'));

router.get('/empresas', asyncHandler(listarEmpresasAdmin));
router.get('/metricas', asyncHandler(metricasAdmin));
router.patch('/empresas/:id/estado', asyncHandler(actualizarEstadoEmpresaAdmin));
router.patch('/empresas/:id/plan', asyncHandler(actualizarPlanEmpresaAdmin));

module.exports = router;
