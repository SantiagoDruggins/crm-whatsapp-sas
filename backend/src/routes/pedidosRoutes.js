const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const empresaEstadoMiddleware = require('../middleware/empresaEstadoMiddleware');
const { requireCrmPermission } = require('../middleware/crmPermissionMiddleware');
const { listar, crear, obtener } = require('../controllers/pedidosController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(authMiddleware);
router.use(empresaEstadoMiddleware);
router.use(requireCrmPermission('pedidos'));

router.get('/', asyncHandler(listar));
router.post('/', asyncHandler(crear));
router.get('/:id', asyncHandler(obtener));

module.exports = router;
