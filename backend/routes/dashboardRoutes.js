const express = require('express');
const {
  getDashboardSummary,
  getWeeklyAnalytics,
} = require('../controllers/dashboardController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', protect, admin, getDashboardSummary);
router.get('/weekly-analytics', protect, admin, getWeeklyAnalytics);

module.exports = router;
