const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const empresaEstadoMiddleware = require('../middleware/empresaEstadoMiddleware');
const { cloudWebhookGet, cloudWebhookPost, cloudWebhookConfig, cloudSend, cloudStatus, cloudConfigUpdate } = require('../controllers/whatsappController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/webhook-config', authMiddleware, asyncHandler(cloudWebhookConfig));
router.get('/status', authMiddleware, empresaEstadoMiddleware, asyncHandler(cloudStatus));
router.patch('/config', authMiddleware, empresaEstadoMiddleware, asyncHandler(cloudConfigUpdate));
router.get('/webhook', cloudWebhookGet);
router.post('/webhook', asyncHandler(cloudWebhookPost));
router.post('/send', authMiddleware, empresaEstadoMiddleware, asyncHandler(cloudSend));

module.exports = router;
