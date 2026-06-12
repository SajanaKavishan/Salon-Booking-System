const express = require('express');
const {
  getAppointmentStatus,
  getDashboardSummary,
  getTopServices,
  getWeeklyAnalytics,
} = require('../controllers/dashboardController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', protect, admin, getDashboardSummary);
router.get('/weekly-analytics', protect, admin, getWeeklyAnalytics);
router.get('/top-services', protect, admin, getTopServices);
router.get('/appointment-status', protect, admin, getAppointmentStatus);

module.exports = router;
