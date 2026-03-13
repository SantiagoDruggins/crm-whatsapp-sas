const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getAuthUrl, callback, disconnect } = require('../controllers/facebookAuthController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/auth-url', authMiddleware, asyncHandler(getAuthUrl));
router.get('/callback', asyncHandler(callback));
router.post('/disconnect', authMiddleware, asyncHandler(disconnect));
router.delete('/disconnect', authMiddleware, asyncHandler(disconnect));

module.exports = router;
