const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, updateUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware'); // Import the protect middleware to secure the /me route   

// Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
// This route is protected by the protect middleware, which means that only authenticated users can access it. The getMe function will return the profile information of the logged-in user.
router.get('/me', protect, getMe); 
router.put('/profile', protect, updateUserProfile);

module.exports = router;