const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { listarEmpresasAdmin, metricasAdmin, actualizarEstadoEmpresaAdmin, actualizarPlanEmpresaAdmin, getAiModelsEmpresaAdmin, updateAiModelsEmpresaAdmin } = require('../controllers/adminController');
const { listarFeedbackAdmin } = require('../controllers/feedbackController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(authMiddleware);
router.use(requireRole('super_admin'));

router.get('/empresas', asyncHandler(listarEmpresasAdmin));
router.get('/metricas', asyncHandler(metricasAdmin));
router.get('/feedback', asyncHandler(listarFeedbackAdmin));
router.patch('/empresas/:id/estado', asyncHandler(actualizarEstadoEmpresaAdmin));
router.patch('/empresas/:id/plan', asyncHandler(actualizarPlanEmpresaAdmin));
router.get('/empresas/:id/ia-models', asyncHandler(getAiModelsEmpresaAdmin));
router.patch('/empresas/:id/ia-models', asyncHandler(updateAiModelsEmpresaAdmin));

module.exports = router;
