const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const empresaEstadoMiddleware = require('../middleware/empresaEstadoMiddleware');
const { requireCrmPermission } = require('../middleware/crmPermissionMiddleware');
const {
  cloudWebhookGet,
  cloudWebhookPost,
  cloudWebhookConfig,
  cloudSend,
  cloudStatus,
  cloudConfigGet,
  cloudConfigUpdate,
  cloudRegisterPhone,
  cloudDebugMeta,
  cloudSubscribeWaba,
} = require('../controllers/whatsappController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/webhook-config', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(cloudWebhookConfig));
router.get('/status', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(cloudStatus));
router.get('/debug-meta', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(cloudDebugMeta));
router.post('/subscribe-waba', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(cloudSubscribeWaba));
router.get('/config', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(cloudConfigGet));
router.patch('/config', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(cloudConfigUpdate));
router.get('/webhook', cloudWebhookGet);
router.post('/webhook', asyncHandler(cloudWebhookPost));
router.post('/send', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(cloudSend));
router.post('/register-phone', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('whatsapp'), asyncHandler(cloudRegisterPhone));

module.exports = router;
