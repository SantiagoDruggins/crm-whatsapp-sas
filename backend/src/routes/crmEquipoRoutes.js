const express = require('express');
const { requireCrmAdmin } = require('../middleware/crmAdminMiddleware');
const c = require('../controllers/crmEquipoController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireCrmAdmin);

router.get('/roles', asyncHandler(c.getRoles));
router.post('/roles', asyncHandler(c.postRol));
router.patch('/roles/:id', asyncHandler(c.patchRol));
router.delete('/roles/:id', asyncHandler(c.deleteRol));

router.get('/usuarios', asyncHandler(c.getUsuarios));
router.post('/usuarios', asyncHandler(c.postUsuario));
router.patch('/usuarios/:id', asyncHandler(c.patchUsuario));

module.exports = router;
