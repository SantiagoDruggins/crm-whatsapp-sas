const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const empresaEstadoMiddleware = require('../middleware/empresaEstadoMiddleware');
const { listar, crear, obtener, syncDropi, syncMastershop } = require('../controllers/pedidosController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(authMiddleware);
router.use(empresaEstadoMiddleware);

router.get('/', asyncHandler(listar));
router.post('/', asyncHandler(crear));
router.get('/:id', asyncHandler(obtener));
router.post('/:id/sync-dropi', asyncHandler(syncDropi));
router.post('/:id/sync-mastershop', asyncHandler(syncMastershop));

module.exports = router;
