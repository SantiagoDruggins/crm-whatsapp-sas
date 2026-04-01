const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const {
  listarEmpresasAdmin,
  obtenerEmpresaDetalleAdmin,
  actualizarNotasInternasAdmin,
  metricasAdmin,
  listWompiTransactionsAdmin,
  actualizarEstadoEmpresaAdmin,
  actualizarPlanEmpresaAdmin,
  actualizarMarcaBlancaEmpresaAdmin,
  subirLogoEmpresaAdmin,
  getAiModelsEmpresaAdmin,
  updateAiModelsEmpresaAdmin,
  getAffiliateCodeEmpresaAdmin,
  setAffiliateCodeEmpresaAdmin,
  setCreatorAffiliateEmpresaAdmin,
} = require('../controllers/adminController');
const { uploadEmpresaLogo } = require('../config/multer');
const { listarFeedbackAdmin } = require('../controllers/feedbackController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(authMiddleware);
router.use(requireRole('super_admin'));

router.get('/empresas', asyncHandler(listarEmpresasAdmin));
router.get('/empresas/:id', asyncHandler(obtenerEmpresaDetalleAdmin));
router.patch('/empresas/:id/notas', asyncHandler(actualizarNotasInternasAdmin));
router.get('/metricas', asyncHandler(metricasAdmin));
router.get('/wompi-transactions', asyncHandler(listWompiTransactionsAdmin));
router.get('/feedback', asyncHandler(listarFeedbackAdmin));
router.patch('/empresas/:id/estado', asyncHandler(actualizarEstadoEmpresaAdmin));
router.patch('/empresas/:id/plan', asyncHandler(actualizarPlanEmpresaAdmin));
router.patch('/empresas/:id/marca-blanca', asyncHandler(actualizarMarcaBlancaEmpresaAdmin));
router.post('/empresas/:id/logo', uploadEmpresaLogo.single('logo'), asyncHandler(subirLogoEmpresaAdmin));
router.get('/empresas/:id/ia-models', asyncHandler(getAiModelsEmpresaAdmin));
router.patch('/empresas/:id/ia-models', asyncHandler(updateAiModelsEmpresaAdmin));
router.get('/empresas/:id/affiliate-code', asyncHandler(getAffiliateCodeEmpresaAdmin));
router.patch('/empresas/:id/affiliate-code', asyncHandler(setAffiliateCodeEmpresaAdmin));
router.patch('/empresas/:id/affiliate-creator', asyncHandler(setCreatorAffiliateEmpresaAdmin));

module.exports = router;
