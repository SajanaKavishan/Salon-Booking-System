const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getLeaveRequests, approveLeave, rejectLeave, getLeaveConflicts } = require('../controllers/leaveController');

router.route('/').get(protect, getLeaveRequests);
router.route('/:id/approve').post(protect, admin, approveLeave);
router.route('/:id/reject').post(protect, admin, rejectLeave);
router.route('/:id/conflicts').get(protect, admin, getLeaveConflicts);

module.exports = router;