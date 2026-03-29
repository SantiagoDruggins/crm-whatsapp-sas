const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const empresaEstadoMiddleware = require('../middleware/empresaEstadoMiddleware');
const { requireCrmPermission } = require('../middleware/crmPermissionMiddleware');
const {
  getAuthUrl,
  callback,
  disconnect,
  getEmbeddedSignupConfig,
  embeddedSignupComplete,
} = require('../controllers/facebookAuthController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/auth-url', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(getAuthUrl));
router.get('/callback', asyncHandler(callback));
router.get('/embedded-signup-config', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(getEmbeddedSignupConfig));
router.post('/embedded-signup-complete', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(embeddedSignupComplete));
router.post('/disconnect', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(disconnect));
router.delete('/disconnect', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(disconnect));

module.exports = router;
