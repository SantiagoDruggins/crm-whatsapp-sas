const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getAuthUrl,
  callback,
  disconnect,
  getEmbeddedSignupConfig,
  embeddedSignupComplete,
} = require('../controllers/facebookAuthController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/auth-url', authMiddleware, asyncHandler(getAuthUrl));
router.get('/callback', asyncHandler(callback));
router.get('/embedded-signup-config', authMiddleware, asyncHandler(getEmbeddedSignupConfig));
router.post('/embedded-signup-complete', authMiddleware, asyncHandler(embeddedSignupComplete));
router.post('/disconnect', authMiddleware, asyncHandler(disconnect));
router.delete('/disconnect', authMiddleware, asyncHandler(disconnect));

module.exports = router;
