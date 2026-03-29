const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const empresaEstadoMiddleware = require('../middleware/empresaEstadoMiddleware');
const { requireCrmPermission } = require('../middleware/crmPermissionMiddleware');
const { getDashboardEmpresa } = require('../controllers/dashboardController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', authMiddleware, empresaEstadoMiddleware, requireCrmPermission('panel'), asyncHandler(getDashboardEmpresa));

module.exports = router;
