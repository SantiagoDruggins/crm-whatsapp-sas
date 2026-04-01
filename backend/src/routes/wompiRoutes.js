const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const empresaEstadoMiddleware = require('../middleware/empresaEstadoMiddleware');
const { requireCrmPermission } = require('../middleware/crmPermissionMiddleware');
const {
  getPublicConfig,
  getFxQuote,
  getWidgetCheckoutParams,
  startSubscription,
  subscriptionStatus,
  listMyTransactions,
  cancelSubscription,
  wompiWebhook,
} = require('../controllers/wompiController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Sin empresaEstadoMiddleware en config / pagos Wompi: una empresa en "pago_en_revision" debe poder abrir checkout y ver historial.
router.get('/config', authMiddleware, requireCrmPermission('pagos'), asyncHandler(getPublicConfig));
router.get('/fx-quote', authMiddleware, requireCrmPermission('pagos'), asyncHandler(getFxQuote));
router.get('/subscription/status', authMiddleware, requireCrmPermission('pagos'), asyncHandler(subscriptionStatus));
router.get('/transactions', authMiddleware, requireCrmPermission('pagos'), asyncHandler(listMyTransactions));
router.post('/subscription/widget-checkout', authMiddleware, requireCrmPermission('pagos'), asyncHandler(getWidgetCheckoutParams));
router.post('/subscription/start', authMiddleware, requireCrmPermission('pagos'), asyncHandler(startSubscription));
router.post('/subscription/cancel', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('pagos'), asyncHandler(cancelSubscription));

// Webhook (sin auth). Requiere que el body raw se capture en app.js (req.rawBody).
router.post('/webhook', asyncHandler(wompiWebhook));

module.exports = router;

