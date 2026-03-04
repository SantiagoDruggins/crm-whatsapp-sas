const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { registrarEmpresa, login, generarSuperAdmin, getMe, actualizarMiPerfil, cambiarPassword, olvidePassword, resetPassword } = require('../controllers/authController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/registro-empresa', asyncHandler(registrarEmpresa));
router.post('/login', asyncHandler(login));
router.post('/olvide-password', asyncHandler(olvidePassword));
router.post('/reset-password', asyncHandler(resetPassword));
router.post('/crear-super-admin', asyncHandler(generarSuperAdmin));

router.get('/me', authMiddleware, asyncHandler(getMe));
router.patch('/me', authMiddleware, asyncHandler(actualizarMiPerfil));
router.post('/cambiar-password', authMiddleware, asyncHandler(cambiarPassword));

module.exports = router;
