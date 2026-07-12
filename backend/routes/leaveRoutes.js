const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getLeaveRequests, approveLeave, rejectLeave, getLeaveConflicts } = require('../controllers/leaveController');
const validateObjectId = require('../middleware/validateObjectId');

router.route('/').get(protect, getLeaveRequests);
router.route('/:id/approve').post(validateObjectId(), protect, admin, approveLeave);
router.route('/:id/reject').post(validateObjectId(), protect, admin, rejectLeave);
router.route('/:id/conflicts').get(validateObjectId(), protect, admin, getLeaveConflicts);

module.exports = router;
