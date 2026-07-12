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
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.get('/', getHolidays);
router.post('/', protect, admin, createHoliday);
router.post('/force', protect, admin, forceCreateHoliday);
router.post('/sync', protect, admin, syncPublicHolidays);
router.put('/:id', validateObjectId(), protect, admin, updateHoliday);
router.delete('/:id', validateObjectId(), protect, admin, deleteHoliday);

module.exports = router;
