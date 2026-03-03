const express = require('express');
const { webhookDropi, webhookMastershop } = require('../controllers/integracionesWebhookController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Estos endpoints están pensados para ser configurados como webhooks en Dropi/Mastershop.
// La autenticación se basa en el token de integración de la empresa.

router.post('/dropi', asyncHandler(webhookDropi));
router.post('/mastershop', asyncHandler(webhookMastershop));

module.exports = router;

