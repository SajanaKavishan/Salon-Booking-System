const User = require('../models/userModel');
const Staff = require('../models/Staff');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios'); 

const normalizeOffDays = (offDays) => {
  if (!offDays) return [];
  if (Array.isArray(offDays)) return offDays.map((day) => day.trim()).filter(Boolean);
  if (typeof offDays === 'string') {
    return offDays
      .split(',')
      .map((day) => day.trim())
      .filter(Boolean);
  }
  return [];
};

const generateToken = (id) => { // Generate a JWT token with the user's ID as payload
    return jwt.sign({ id }, process.env.JWT_SECRET, { // Token expires in 30 days
        expiresIn: '30d', 
    });
};

const formatLeaveDate = (startDate, endDate = startDate) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
  const start = formatter.format(new Date(startDate));
  const end = formatter.format(new Date(endDate));
  return start === end ? start : `${start} - ${end}`;
};

const resolvePreferredStylistId = async (preferredStylist) => {
  if (preferredStylist === null || preferredStylist === '') return null;
  if (preferredStylist === undefined) return undefined;

  if (mongoose.isValidObjectId(preferredStylist)) {
    const user = await User.findOne({ _id: preferredStylist, role: 'staff' }).select('_id');
    if (user) return user._id;

    const staff = await Staff.findById(preferredStylist).select('userId');
    if (staff?.userId) return staff.userId;
  }

  const staff = await Staff.findOne({ name: preferredStylist }).select('userId');
  if (staff?.userId) return staff.userId;

  const error = new Error('Please select a valid stylist.');
  error.statusCode = 400;
  throw error;
};

const registerUser = async (req, res) => { // Register a new user
    try {
    const { name, email, password, phone, preferredStylist } = req.body;
    if (!name || !email || !password || !phone) { // Check if all required fields are provided
            return res.status(400).json({ message: 'Please enter all details' });
        }
        const userExists = await User.findOne({ email });
        if (userExists) { // If a user with the same email already exists, return an error
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const resolvedPreferredStylist = await resolvePreferredStylistId(preferredStylist);
        const user = await User.create({ // Create a new user in the database with the provided details and hashed password
            name,
            email,
            phone,
            preferredStylist: resolvedPreferredStylist || null,
            profileImage: req.body.profileImage || '',
            password: hashedPassword,
            role: 'customer',
        });

        if (user) { // If user creation is successful, return the user's details along with a generated token
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                preferredStylist: user.preferredStylist,
                profileImage: user.profileImage || '',
                role: user.role,
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
            return res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                preferredStylist: user.preferredStylist || '',
                profileImage: user.profileImage || '',
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
      const googleRes = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const { email, name } = googleRes.data;
      let user = await User.findOne({ email });
      if (user) {
        return res.json({
          _id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          preferredStylist: user.preferredStylist || '',
          profileImage: user.profileImage || '',
          role: user.role,
          token: generateToken(user._id),
        });
      }

      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);
      const resolvedPreferredStylist = await resolvePreferredStylistId(req.body.preferredStylist);
      user = await User.create({
        name,
        email,
        phone: req.body.phone || 'Not Provided',
        preferredStylist: resolvedPreferredStylist || null,
        profileImage: req.body.profileImage || '',
        password: hashedPassword,
        role: 'customer'
      });

      if (user) {
        return res.status(201).json({
          _id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          preferredStylist: user.preferredStylist || '',
          profileImage: user.profileImage || '',
          role: user.role,
          token: generateToken(user._id),
        });
      }

      res.status(400).json({ message: 'Invalid user data' });
    } catch (error) {
      console.error('Google login error:', error);
      res.status(401).json({ message: 'Google authentication failed' });
    }
};
// Get user profile function
const getMe = async (req, res) => {
  try {
    const user = req.user.toObject ? req.user.toObject() : req.user;

    if (user.role === 'staff') {
      const staffDetails = await Staff.findOne({ userId: user._id }).lean();
      const profileImage = user.profileImage || staffDetails?.imageUrl || '';
      const offDays = normalizeOffDays(staffDetails?.offDays);

      return res.status(200).json({
        ...user,
        staffDetails,
        profileImage,
        imageUrl: staffDetails?.imageUrl || user.profileImage || '',
        specialty: staffDetails?.specialty || '',
        workingHours: staffDetails?.workingHours || '',
        offDays,
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile function
const updateUserProfile = async (req, res) => {
  try {
    const { name, email, phone, preferredStylist, profileImage, password, specialty, workingHours, offDays } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const previousPreferredStylist = user.preferredStylist?.toString() || null;
    const resolvedPreferredStylist = await resolvePreferredStylistId(preferredStylist);

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone !== undefined ? phone : user.phone;
    user.preferredStylist = resolvedPreferredStylist !== undefined
      ? resolvedPreferredStylist
      : user.preferredStylist;
    user.profileImage = profileImage !== undefined ? profileImage : user.profileImage;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await user.save();

    const preferredStylistChanged = resolvedPreferredStylist !== undefined
      && previousPreferredStylist !== (updatedUser.preferredStylist?.toString() || null);

    if (preferredStylistChanged && updatedUser.preferredStylist) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const upcomingLeaves = await LeaveRequest.find({
        staffId: updatedUser.preferredStylist,
        status: { $in: ['Approved', 'approved'] },
        endDate: { $gte: today }
      }).sort({ startDate: 1 });

      if (upcomingLeaves.length > 0) {
        await Notification.insertMany(upcomingLeaves.map((leave) => ({
          user: updatedUser._id,
          type: 'INFO',
          message: `Just a heads-up! Your preferred stylist will be on leave on ${formatLeaveDate(leave.startDate, leave.endDate)}. Plan your next visit accordingly!`
        })));
      }
    }

    let staffDetails = null;
    if (updatedUser.role === 'staff') {
      const normalizedOffDays = normalizeOffDays(offDays);
      staffDetails = await Staff.findOne({ userId: updatedUser._id });

      if (!staffDetails) {
        staffDetails = await Staff.create({
          userId: updatedUser._id,
          name: updatedUser.name,
          imageUrl: profileImage || '',
          specialty: specialty || '',
          workingHours: workingHours || '',
          offDays: normalizedOffDays,
        });
      } else {
        staffDetails.name = updatedUser.name || staffDetails.name;
        staffDetails.imageUrl = profileImage ? profileImage : staffDetails.imageUrl;
        staffDetails.specialty = specialty !== undefined ? specialty : staffDetails.specialty;
        staffDetails.workingHours = workingHours !== undefined ? workingHours : staffDetails.workingHours;
        staffDetails.offDays = normalizedOffDays.length ? normalizedOffDays : staffDetails.offDays;
        await staffDetails.save();
      }
    }

    const mergedProfileImage = updatedUser.profileImage || staffDetails?.imageUrl || '';
    const mergedResponse = {
      _id: updatedUser._id,
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || '',
      preferredStylist: updatedUser.preferredStylist || '',
      profileImage: mergedProfileImage,
      _id: updatedUser._id,
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || '',
      preferredStylist: updatedUser.preferredStylist || '',
      profileImage,
      role: updatedUser.role,
      token: req.headers.authorization ? req.headers.authorization.split(' ')[1] : '',
      staffDetails,
      specialty: staffDetails?.specialty || '',
      workingHours: staffDetails?.workingHours || '',
      offDays: normalizeOffDays(staffDetails?.offDays),
      imageUrl: staffDetails?.imageUrl || updatedUser.profileImage || '',
    };

    res.json(mergedResponse);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = { // Export all the controller functions to be used in the routes
    registerUser,
    loginUser,
    googleLogin, 
    getMe,
    updateUserProfile
};
