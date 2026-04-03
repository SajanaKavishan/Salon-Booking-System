const express = require('express');
const router = express.Router();
const { getStaff, addStaff, deleteStaff } = require('../controllers/staffController');

router.route('/').get(getStaff).post(addStaff);
router.route('/:id').delete(deleteStaff);

module.exports = router;