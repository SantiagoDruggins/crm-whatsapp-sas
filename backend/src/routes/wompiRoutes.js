const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const empresaEstadoMiddleware = require('../middleware/empresaEstadoMiddleware');
const {
  getPublicConfig,
  startSubscription,
  subscriptionStatus,
  cancelSubscription,
  wompiWebhook,
} = require('../controllers/wompiController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/config', authMiddleware, asyncHandler(getPublicConfig));
router.get('/subscription/status', authMiddleware, empresaEstadoMiddleware, asyncHandler(subscriptionStatus));
router.post('/subscription/start', authMiddleware, asyncHandler(startSubscription));
router.post('/subscription/cancel', authMiddleware, empresaEstadoMiddleware, asyncHandler(cancelSubscription));

// Webhook (sin auth). Requiere que el body raw se capture en app.js (req.rawBody).
router.post('/webhook', asyncHandler(wompiWebhook));

module.exports = router;

