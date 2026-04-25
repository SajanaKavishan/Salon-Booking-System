const express = require('express');
const router = express.Router();
const { registerUser, googleLogin, getMe, updateUserProfile } = require('../controllers/userController');
const { registerStaff, login } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware'); // Import the protect middleware to secure the /me route   

// Routes
router.post('/register', registerUser); // Route for user registration, handled by the registerUser controller function
router.post('/login', login); // Route for user login, handled by the login controller function
router.post('/register-staff', protect, admin, registerStaff); // Admin-only route for staff account creation
router.post('/google-login', googleLogin); // New route for handling Google login requests

// This route is protected by the protect middleware, which means that only authenticated users can access it. The getMe function will return the profile information of the logged-in user.
router.get('/me', protect, getMe); // Route for updating user profile, also protected by the protect middleware. The updateUserProfile function will handle the logic for updating the user's profile information.
router.put('/profile', protect, updateUserProfile); // New route for updating user profile, also protected by the protect middleware. The updateUserProfile function will handle the logic for updating the user's profile information.

module.exports = router;
