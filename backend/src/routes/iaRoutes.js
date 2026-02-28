const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const empresaEstadoMiddleware = require('../middleware/empresaEstadoMiddleware');
const { uploadBotConocimiento } = require('../config/multer');
const { responder, listarBots, crearBot, obtenerBot, actualizarBot, eliminarBot, subirArchivoConocimiento } = require('../controllers/iaController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(authMiddleware);
router.use(empresaEstadoMiddleware);

router.post('/responder', asyncHandler(responder));
router.get('/bots', asyncHandler(listarBots));
router.post('/bots', asyncHandler(crearBot));
router.get('/bots/:id', asyncHandler(obtenerBot));
router.patch('/bots/:id', asyncHandler(actualizarBot));
router.delete('/bots/:id', asyncHandler(eliminarBot));
router.post('/bots/:id/archivo', uploadBotConocimiento.single('archivo'), asyncHandler(subirArchivoConocimiento));

module.exports = router;
