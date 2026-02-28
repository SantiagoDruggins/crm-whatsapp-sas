const express = require('express');
const { registrarEmpresa, login, generarSuperAdmin } = require('../controllers/authController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/registro-empresa', asyncHandler(registrarEmpresa));
router.post('/login', asyncHandler(login));
router.post('/crear-super-admin', asyncHandler(generarSuperAdmin));

module.exports = router;
