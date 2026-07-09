const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { registerUser, googleLogin, getUsers, getMe, updateUserProfile, completeOnboarding, getDashboardBanner } = require('../controllers/userController');
const { registerStaff, login, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware'); // Import the protect middleware to secure the /me route   
const uploadProfileImage = require('../middleware/uploadProfileImage');

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
  },
});

const handleProfileImageUpload = (req, res, next) => {
  uploadProfileImage.single('profileImage')(req, res, (error) => {
    if (!error) {
      return next();
    }

    const statusCode = error.statusCode || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Profile image must be 2MB or smaller.'
      : error.message;

    return res.status(statusCode).json({ message });
  });
};

// Routes
router.post('/register', registerRateLimiter, registerUser); // Route for user registration, handled by the registerUser controller function
router.post('/login', loginRateLimiter, login); // Route for user login, handled by the login controller function
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.post('/register-staff', protect, admin, registerStaff); // Admin-only route for staff account creation
router.post('/google-login', loginRateLimiter, googleLogin); // New route for handling Google login requests

// This route is protected by the protect middleware, which means that only authenticated users can access it. The getMe function will return the profile information of the logged-in user.
router.get('/', protect, admin, getUsers);
router.get('/me', protect, getMe);
router.get('/profile', protect, getMe); // Alias for legacy frontend calls to GET /api/users/profile
router.get('/dashboard-banner', protect, getDashboardBanner);
router.put('/profile', protect, handleProfileImageUpload, updateUserProfile); // New route for updating user profile, also protected by the protect middleware. The updateUserProfile function will handle the logic for updating the user's profile information.
router.patch('/complete-onboarding', protect, completeOnboarding);

module.exports = router;
