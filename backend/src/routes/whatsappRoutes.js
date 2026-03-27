const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const empresaEstadoMiddleware = require('../middleware/empresaEstadoMiddleware');
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
} = require('../controllers/whatsappController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/webhook-config', authMiddleware, asyncHandler(cloudWebhookConfig));
router.get('/status', authMiddleware, empresaEstadoMiddleware, asyncHandler(cloudStatus));
router.get('/debug-meta', authMiddleware, asyncHandler(cloudDebugMeta));
router.get('/config', authMiddleware, empresaEstadoMiddleware, asyncHandler(cloudConfigGet));
router.patch('/config', authMiddleware, empresaEstadoMiddleware, asyncHandler(cloudConfigUpdate));
router.get('/webhook', cloudWebhookGet);
router.post('/webhook', asyncHandler(cloudWebhookPost));
router.post('/send', authMiddleware, empresaEstadoMiddleware, asyncHandler(cloudSend));
router.post('/register-phone', authMiddleware, empresaEstadoMiddleware, asyncHandler(cloudRegisterPhone));

module.exports = router;
