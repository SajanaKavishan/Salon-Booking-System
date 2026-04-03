const express = require('express');
const router = express.Router();
const { getServices, createService, deleteService } = require('../controllers/serviceController');

router.route('/').get(getServices).post(createService);
router.route('/:id').delete(deleteService);

module.exports = router;