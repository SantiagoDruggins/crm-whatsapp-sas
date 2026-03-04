const express = require('express');
const { webhookDropi, webhookMastershop, webhookShopify } = require('../controllers/integracionesWebhookController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Webhooks Dropi / Mastershop: autenticación por token de integración.
router.post('/dropi', asyncHandler(webhookDropi));
router.post('/mastershop', asyncHandler(webhookMastershop));

// Webhook Shopify: body raw para verificar HMAC. X-Shopify-Shop-Domain identifica la empresa.
router.post('/shopify', express.raw({ type: 'application/json' }), asyncHandler(webhookShopify));

module.exports = router;

