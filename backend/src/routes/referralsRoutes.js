const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getMyAffiliateData } = require('../controllers/referralsController');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/me', authMiddleware, asyncHandler(getMyAffiliateData));

module.exports = router;
