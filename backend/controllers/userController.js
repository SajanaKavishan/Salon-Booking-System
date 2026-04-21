const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios'); 

const generateToken = (id) => { // Generate a JWT token with the user's ID as payload
    return jwt.sign({ id }, process.env.JWT_SECRET, { // Token expires in 30 days
        expiresIn: '30d', 
    });
};

const registerUser = async (req, res) => { // Register a new user
    try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) { // Check if all required fields are provided
            return res.status(400).json({ message: 'Please enter all details' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) { // If a user with the same email already exists, return an error
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({ // Create a new user in the database with the provided details and hashed password
            name,
            email,
          phone,
            password: hashedPassword,
        });

        if (user) { // If user creation is successful, return the user's details along with a generated token
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                token: generateToken(user._id), 
            });
        } else {
            res.status(400).json({ message: 'Failed to create user' });
        }
    } catch (error) { 
        res.status(500).json({ message: error.message });
    }
};

// Login function
const loginUser = async (req, res) => { // Authenticate a user and return their details along with a token if successful
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) { // If the user exists and the provided password matches the hashed password in the database, return the user's details and a token
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
            phone: user.phone,
                role: user.role,
                token: generateToken(user._id), //Create a token for the user
            });
        } else { 
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) { 
        res.status(500).json({ message: error.message });
    }
};

// @desc    Google Login
// @route   POST /api/users/google-login
// @access  Public
const googleLogin = async (req, res) => {
    const { token } = req.body; 
  
    try {
      // Use the token to get user info from Google
      const googleRes = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      const { email, name } = googleRes.data;
  
      // Check if user already exists in our database
      let user = await User.findOne({ email });
  
      if (user) {
        // If user exists, just return their info and a new token
        res.json({
          _id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          token: generateToken(user._id),
        });
      } else {
        // If user doesn't exist, create a new one with a random password (since they won't use it)
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);
  
        user = await User.create({ // Create a new user in the database with the Google info and a hashed random password
          name,
          email,
          phone: 'Not Provided',
          password: hashedPassword, 
          role: 'customer', 
        });
  
        if (user) { // If user creation is successful, return the user's details along with a generated token
          res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            token: generateToken(user._id),
          });
        } else {
          res.status(400).json({ message: 'Invalid user data' });
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
      res.status(401).json({ message: 'Google authentication failed' });
    }
};

// Get user profile function
const getMe = async (req, res) => {
    res.status(200).json(req.user);
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) { // If the user is found, update their details with the provided data (if any)
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        token: req.headers.authorization.split(' ')[1], 
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { // Export all the controller functions to be used in the routes
    registerUser,
    loginUser,
    googleLogin, 
    getMe,
    updateUserProfile
};