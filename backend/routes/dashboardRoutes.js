const express = require('express');
const { getDashboardSummary } = require('../controllers/dashboardController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', protect, admin, getDashboardSummary);

module.exports = router;
