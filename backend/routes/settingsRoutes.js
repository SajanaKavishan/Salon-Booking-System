const express = require('express');
const router = express.Router();
const { getSettings, updateHomePageImage, updateSettings } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');
const uploadHomePageImage = require('../middleware/uploadHomePageImage');

router.get('/', getSettings);
router.put('/', protect, admin, updateSettings);
router.post('/images/:imageKey', protect, admin, uploadHomePageImage.single('image'), updateHomePageImage);

module.exports = router;
