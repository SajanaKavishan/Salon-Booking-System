const User = require('../models/userModel');
const Staff = require('../models/Staff');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const Service = require('../models/Service');
const generateAvailableSlots = require('../utils/slotGenerator');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios'); 
const {
  normalizeOffDays,
  normalizeWorkingHours,
} = require('../utils/staffSchedule');

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

const NO_PREFERRED_STYLIST_BANNER_MESSAGE = 'Ready to elevate your aesthetic? Explore our master stylists and reserve your luxury grooming experience today.';

const toDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getTodayDateString = () => {
  const today = new Date();
  return toDateString(today);
};

const getPreferredStaff = async (preferredStylist) => {
  if (!preferredStylist || !mongoose.isValidObjectId(preferredStylist)) return null;

  return Staff.findOne({
    $or: [
      { userId: preferredStylist },
      { _id: preferredStylist },
    ],
  }).lean();
};

const timeToMinutes = (value) => {
  if (typeof value !== 'string') return null;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59) return null;

  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (hours === 12) hours = 0;
    if (period === 'PM') hours += 12;
  } else if (hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
};

const getCurrentMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const getFirstName = (name) => String(name || 'Your stylist').trim().split(/\s+/)[0];

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
                isFirstLogin: user.isFirstLogin,
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
                isFirstLogin: user.isFirstLogin,
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
          isFirstLogin: user.isFirstLogin,
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
          isFirstLogin: user.isFirstLogin,
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
      const offDays = normalizeOffDays(staffDetails?.offDays) || [];

      return res.status(200).json({
        ...user,
        staffDetails,
        profileImage,
        imageUrl: staffDetails?.imageUrl || user.profileImage || '',
        specialty: staffDetails?.specialty || '',
        workingHours: normalizeWorkingHours(staffDetails?.workingHours),
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
          workingHours: normalizeWorkingHours(workingHours),
          offDays: normalizedOffDays || [],
        });
      } else {
        staffDetails.name = updatedUser.name || staffDetails.name;
        staffDetails.imageUrl = profileImage ? profileImage : staffDetails.imageUrl;
        staffDetails.specialty = specialty !== undefined ? specialty : staffDetails.specialty;
        if (workingHours !== undefined) {
          staffDetails.workingHours = normalizeWorkingHours(workingHours);
        }
        if (offDays !== undefined) {
          staffDetails.offDays = normalizedOffDays;
        }
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
      workingHours: normalizeWorkingHours(staffDetails?.workingHours),
      offDays: normalizeOffDays(staffDetails?.offDays) || [],
      imageUrl: staffDetails?.imageUrl || updatedUser.profileImage || '',
    };

    res.json(mergedResponse);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Mark the premium customer onboarding flow as complete for the authenticated user.
const completeOnboarding = async (req, res) => {
  try {
    const resolvedPreferredStylist = await resolvePreferredStylistId(req.body?.preferredStylist);
    const updates = { isFirstLogin: false };

    if (resolvedPreferredStylist !== undefined) {
      updates.preferredStylist = resolvedPreferredStylist;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Onboarding completed successfully.',
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDashboardBanner = async (req, res) => {
  try {
    const preferredStaff = await getPreferredStaff(req.user?.preferredStylist);

    if (!preferredStaff) {
      return res.status(200).json({
        scenario: 'no_preferred_stylist',
        message: NO_PREFERRED_STYLIST_BANNER_MESSAGE,
        slotsOpen: 0,
        hasPreferredStylist: false,
      });
    }

    const shortestService = await Service.findOne({})
      .sort({ duration: 1 })
      .select('duration')
      .lean();
    const serviceDuration = Number.isInteger(shortestService?.duration) && shortestService.duration > 0
      ? shortestService.duration
      : 60;

    const slots = await generateAvailableSlots({
      staffId: preferredStaff._id,
      date: getTodayDateString(),
      serviceDuration,
    });
    const actualSlotsOpen = slots.length;
    const displaySlotsOpen = Math.min(actualSlotsOpen, 4);

    if (displaySlotsOpen > 0) {
      return res.status(200).json({
        scenario: 'slots_available',
        message: `Your preferred stylist, ${preferredStaff.name}, has only ${displaySlotsOpen} slot${displaySlotsOpen === 1 ? '' : 's'} left today! Book now to secure your session.`,
        stylistName: preferredStaff.name,
        slotsOpen: displaySlotsOpen,
        actualSlotsOpen,
        hasPreferredStylist: true,
      });
    }

    const stylistFirstName = getFirstName(preferredStaff.name);
    const workingEndMinutes = timeToMinutes(preferredStaff.workingHours?.end || '17:00');
    const isPastWorkingHours = workingEndMinutes !== null && getCurrentMinutes() > workingEndMinutes;

    if (isPastWorkingHours) {
      return res.status(200).json({
        scenario: 'closed_for_day',
        message: `${stylistFirstName}'s styling hours have concluded for today. Explore availability and reserve your premier slot for tomorrow or later this week.`,
        stylistName: preferredStaff.name,
        slotsOpen: 0,
        actualSlotsOpen,
        hasPreferredStylist: true,
      });
    }

    return res.status(200).json({
      scenario: 'fully_booked',
      message: `${stylistFirstName} is fully booked today with premium grooming sessions. Secure your exclusive slot for tomorrow or later this week to ensure your look stays effortless.`,
      stylistName: preferredStaff.name,
      slotsOpen: 0,
      actualSlotsOpen,
      hasPreferredStylist: true,
    });
  } catch (error) {
    console.error('Dashboard Banner Error:', error);
    return res.status(500).json({
      message: 'Server Error: Could not build dashboard banner.',
    });
  }
};

module.exports = { // Export all the controller functions to be used in the routes
    registerUser,
    loginUser,
    googleLogin, 
    getMe,
    updateUserProfile,
    completeOnboarding,
    getDashboardBanner
};
