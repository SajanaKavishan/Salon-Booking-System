const express = require('express');
const {
  createHoliday,
  deleteHoliday,
  forceCreateHoliday,
  getHolidays,
  syncPublicHolidays,
  updateHoliday,
} = require('../controllers/holidayController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getHolidays);
router.post('/', protect, admin, createHoliday);
router.post('/force', protect, admin, forceCreateHoliday);
router.post('/sync', protect, admin, syncPublicHolidays);
router.put('/:id', protect, admin, updateHoliday);
router.delete('/:id', protect, admin, deleteHoliday);

module.exports = router;
