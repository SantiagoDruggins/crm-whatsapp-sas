const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const empresaEstadoMiddleware = require('../middleware/empresaEstadoMiddleware');
const { getConfig, updateConfig } = require('../controllers/integracionesController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(authMiddleware);
router.use(empresaEstadoMiddleware);

router.get('/', asyncHandler(getConfig));
router.patch('/', asyncHandler(updateConfig));

module.exports = router;
