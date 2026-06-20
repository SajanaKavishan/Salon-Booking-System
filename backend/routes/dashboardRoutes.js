const express = require('express');
const {
  getDashboardSummary,
  getWeeklyAnalytics,
} = require('../controllers/dashboardController');
const {
  getAnalyticsSummary,
  getAppointmentStatus,
  getTopServices,
} = require('../controllers/analyticsController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', protect, admin, getDashboardSummary);
router.get('/weekly-analytics', protect, admin, getWeeklyAnalytics);
router.get('/analytics-summary', protect, admin, getAnalyticsSummary);
router.get('/top-services', protect, admin, getTopServices);
router.get('/appointment-status', protect, admin, getAppointmentStatus);

module.exports = router;
