const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Staff = require('../models/Staff');
const {
  normalizeOffDays,
  normalizeWorkingHours,
} = require('../utils/staffSchedule');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d'
    }
  );
};

const registerStaff = async (req, res) => {
  try {
    const { name, email, password, specialty, offDays, workingHours } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const staffUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'staff',
      phone: req.body.phone || 'Not Provided'
    });

    let staffProfile = null;
    if (specialty) {
      staffProfile = await Staff.create({
        userId: staffUser._id,
        name: staffUser.name,
        imageUrl: req.body.imageUrl || req.body.profileImage || '',
        specialty,
        offDays: normalizeOffDays(offDays),
        workingHours: normalizeWorkingHours(workingHours),
      });
    }

    return res.status(201).json({
      _id: staffUser._id,
      name: staffUser.name,
      email: staffUser.email,
      role: staffUser.role,
      staffDetails: staffProfile,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    let profileImage = user.profileImage || '';
    let specialty = '';
    let offDays = [];
    let workingHours = normalizeWorkingHours();

    if (user.role === 'staff') {
      const staffDetails = await Staff.findOne({ userId: user._id }).lean();
      if (staffDetails) {
        profileImage = profileImage || staffDetails.imageUrl || '';
        specialty = staffDetails.specialty || '';
        workingHours = normalizeWorkingHours(staffDetails.workingHours);
        offDays = Array.isArray(staffDetails.offDays)
          ? staffDetails.offDays
          : typeof staffDetails.offDays === 'string'
          ? staffDetails.offDays.split(',').map((day) => day.trim()).filter(Boolean)
          : [];
      }
    }

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      preferredStylist: user.preferredStylist || '',
      profileImage,
      imageUrl: profileImage,
      isFirstLogin: user.isFirstLogin,
      specialty,
      workingHours,
      offDays,
      role: user.role,
      token
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerStaff,
  login
};
