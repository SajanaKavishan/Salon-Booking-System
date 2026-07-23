const User = require('../models/userModel');
const Staff = require('../models/Staff');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const Service = require('../models/Service');
const generateAvailableSlots = require('../utils/slotGenerator');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const {
  cleanupUploadedCloudinaryFile,
  queueCloudinaryAssetDeletion,
  resolveCloudinaryPublicId,
} = require('../utils/cloudinaryAssets');
const { getSalonDateTimeParts } = require('../utils/salonTime');
const {
  normalizeOffDays,
  normalizeWorkingHours,
} = require('../utils/staffSchedule');

const generateToken = (user) => { // Generate a JWT token with the user's ID as payload
    const id = user?._id || user;
    const payload = {
      id,
      ...(user?.role ? { role: user.role } : {}),
      ...(user?.passwordChangedAt ? {
        passwordChangedAt: new Date(user.passwordChangedAt).toISOString(),
      } : {}),
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { // Token expires in 30 days
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

const formatDisplayDate = (dateValue) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });

  return formatter.format(new Date(dateValue));
};

const NO_PREFERRED_STYLIST_BANNER_MESSAGE = 'Ready to elevate your aesthetic? Explore our master stylists and reserve your luxury grooming experience today.';
const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const getTodayDateString = () => getSalonDateTimeParts().dateKey;

const getDateWindow = (dateString) => {
  const startDate = new Date(`${dateString}T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  return { startDate, endDate };
};

const getStaffOffDayName = (staff, date) => {
  const dayName = DAY_NAMES[date.getUTCDay()];
  const offDays = normalizeOffDays(staff?.offDays) || [];

  return offDays.some(
    (offDay) => String(offDay).trim().toLowerCase() === dayName.toLowerCase()
  )
    ? dayName
    : null;
};

const findApprovedLeaveForDate = async (staff, startDate, endDate) => {
  const leaveStaffIds = [staff?.userId, staff?._id].filter(Boolean);
  if (leaveStaffIds.length === 0) return null;

  return LeaveRequest.findOne({
    staffId: { $in: leaveStaffIds },
    status: { $in: ['Approved', 'approved'] },
    startDate: { $lt: endDate },
    endDate: { $gte: startDate },
  })
    .sort({ startDate: 1 })
    .lean();
};

const getPostLeaveBookingWindow = (leaveEndDate, todayStartDate) => {
  const nextAvailableDate = new Date(leaveEndDate);
  nextAvailableDate.setUTCDate(nextAvailableDate.getUTCDate() + 1);

  const tomorrow = new Date(todayStartDate);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  return nextAvailableDate.getTime() <= tomorrow.getTime()
    ? 'tomorrow or later this week'
    : `${formatDisplayDate(nextAvailableDate)} onward`;
};

const getPreferredStaff = async (preferredStylist) => {
  if (!preferredStylist || !mongoose.isValidObjectId(preferredStylist)) return null;

  return Staff.findOne({
    isActive: { $ne: false },
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

const getCurrentMinutes = () => getSalonDateTimeParts().minutes;

const getFirstName = (name) => String(name || 'Your stylist').trim().split(/\s+/)[0];

const resolvePreferredStylistId = async (preferredStylist) => {
  if (preferredStylist === undefined) return undefined;
  const preferredStylistValue = typeof preferredStylist === 'string'
    ? preferredStylist.trim()
    : preferredStylist;
  if (preferredStylistValue === null || preferredStylistValue === '') return null;

  if (mongoose.isValidObjectId(preferredStylistValue)) {
    const user = await User.findOne({
      _id: preferredStylistValue,
      role: 'staff',
      isActive: { $ne: false },
    }).select('_id');
    if (user) {
      const activeStaffProfile = await Staff.exists({
        userId: user._id,
        isActive: { $ne: false },
      });
      if (activeStaffProfile) return user._id;
    }

    const staff = await Staff.findOne({
      _id: preferredStylistValue,
      isActive: { $ne: false },
    }).select('userId');
    if (staff?.userId) return staff.userId;
  }

  const staff = await Staff.findOne({
    name: preferredStylistValue,
    isActive: { $ne: false },
  }).select('userId');
  if (staff?.userId) return staff.userId;

  const error = new Error('Please select a valid stylist.');
  error.statusCode = 400;
  throw error;
};

const isValidPhoneNumber = (phoneValue) => {
  const normalizedPhone = String(phoneValue || '').trim().replace(/[\s-]/g, '');
  return /^(?:\+94|0)7\d{8}$/.test(normalizedPhone);
};

const OAUTH_PHONE_FALLBACK = '';
const GOOGLE_TOKEN_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

const isValidEmail = (emailValue) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailValue || '').trim());

const isBase64Image = (value) => /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(value || '').trim());

const registerUser = async (req, res) => { // Register a new user
    try {
    const { name, email, password, phone, preferredStylist } = req.body;
    if (!name || !email || !password || !phone) { // Check if all required fields are provided
            return res.status(400).json({ message: 'Please enter all details' });
        }

        const normalizedName = String(name).trim();
        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedPhone = String(phone).trim().replace(/[\s-]/g, '');

        if (normalizedName.length < 1 || normalizedName.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Name must be between 1 and 100 characters long.',
            });
        }

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address.',
            });
        }

        if (String(password).length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long.',
            });
        }

        if (!isValidPhoneNumber(normalizedPhone)) {
            return res.status(400).json({ message: 'Please enter a valid phone number.' });
        }

        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) { // If a user with the same email already exists, return an error
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const resolvedPreferredStylist = await resolvePreferredStylistId(preferredStylist);
        const user = await User.create({ // Create a new user in the database with the provided details and hashed password
            name: normalizedName,
            email: normalizedEmail,
            phone: normalizedPhone,
            preferredStylist: resolvedPreferredStylist || null,
            profileImage: req.body.profileImage || '',
            profileImagePublicId: resolveCloudinaryPublicId('', req.body.profileImage),
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
        const user = await User.findOne({ email }).select('+password');
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
const verifyGoogleIdToken = async (idToken) => {
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    if (!clientId) {
      const error = new Error('Google OAuth is not configured on the server.');
      error.statusCode = 500;
      throw error;
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload || !GOOGLE_TOKEN_ISSUERS.has(payload.iss)) {
      const error = new Error('Google ID token has an invalid issuer.');
      error.statusCode = 401;
      throw error;
    }

    return payload;
};

const createGoogleLoginHandler = ({ verifyToken = verifyGoogleIdToken } = {}) => async (req, res) => {
    const idToken = typeof req.body?.idToken === 'string'
      ? req.body.idToken.trim()
      : typeof req.body?.token === 'string'
        ? req.body.token.trim()
        : '';

    if (!idToken) {
      return res.status(401).json({ message: 'A valid Google ID token is required.' });
    }

    let googlePayload;
    try {
      googlePayload = await verifyToken(idToken);
    } catch (error) {
      if (error?.statusCode >= 500) {
        console.error('Google OAuth configuration error:', error.message);
        return res.status(500).json({ message: 'Google authentication is unavailable.' });
      }

      console.warn('Google ID token verification failed:', error.message);
      return res.status(401).json({ message: 'Google authentication failed.' });
    }

    if (googlePayload.email_verified !== true) {
      return res.status(401).json({ message: 'Google account email is not verified.' });
    }

    const email = String(googlePayload.email || '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(401).json({ message: 'Google account did not provide a valid email.' });
    }

    const name = String(
      googlePayload.name
      || googlePayload.given_name
      || email.split('@')[0]
    ).trim();

    try {
      let user = await User.findOne({ email });
      if (user) {
        if (user.isActive === false) {
          return res.status(403).json({
            message: 'This account is inactive. Please contact the salon administrator.',
          });
        }

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

      const randomPassword = crypto.randomBytes(32).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);
      const resolvedPreferredStylist = await resolvePreferredStylistId(req.body.preferredStylist);
      const normalizedPhone = String(req.body.phone || '').trim();
      const verifiedProfileImage = typeof googlePayload.picture === 'string'
        ? googlePayload.picture.trim()
        : '';
      user = await User.create({
        name,
        email,
        phone: isValidPhoneNumber(normalizedPhone) ? normalizedPhone : OAUTH_PHONE_FALLBACK,
        preferredStylist: resolvedPreferredStylist || null,
        profileImage: verifiedProfileImage,
        profileImagePublicId: resolveCloudinaryPublicId('', verifiedProfileImage),
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

      return res.status(400).json({ message: 'Invalid user data' });
    } catch (error) {
      console.error('Google login error:', error);
      return res.status(500).json({ message: 'Could not complete Google login.' });
    }
};

const googleLogin = createGoogleLoginHandler();

const buildSafeUserDto = (userValue) => {
  const user = userValue?.toObject ? userValue.toObject() : (userValue || {});
  const isProfileComplete = typeof user.isProfileComplete === 'boolean'
    ? user.isProfileComplete
    : user.isFirstLogin === false;

  return {
    _id: user._id,
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'customer',
    mobile: user.mobile || user.phone || '',
    avatar: user.avatar || user.profileImage || '',
    preferredStylist: user.preferredStylist || '',
    isProfileComplete,
  };
};

// Get the minimal authenticated user identity payload.
const getMe = async (req, res) => {
  try {
    return res.status(200).json(buildSafeUserDto(req.user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Legacy profile payload used by profile and staff scheduling screens. It is
// explicitly allowlisted and never spreads the authentication document.
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('_id name email role phone preferredStylist profileImage isFirstLogin')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const safeUser = buildSafeUserDto(user);
    const legacySafeProfile = {
      ...safeUser,
      phone: safeUser.mobile,
      profileImage: safeUser.avatar,
      isFirstLogin: !safeUser.isProfileComplete,
      preferredStylist: user.preferredStylist || '',
    };

    if (user.role === 'staff') {
      const staffDetails = await Staff.findOne({ userId: user._id }).lean();
      const profileImage = safeUser.avatar || staffDetails?.imageUrl || '';
      const offDays = normalizeOffDays(staffDetails?.offDays) || [];

      return res.status(200).json({
        ...legacySafeProfile,
        staffDetails,
        profileImage,
        avatar: profileImage,
        imageUrl: staffDetails?.imageUrl || safeUser.avatar || '',
        specialty: staffDetails?.specialty || '',
        workingHours: normalizeWorkingHours(staffDetails?.workingHours),
        offDays,
      });
    }

    return res.status(200).json(legacySafeProfile);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const allowedRoles = ['customer', 'staff', 'admin'];
    const role = typeof req.query.role === 'string' ? req.query.role.trim().toLowerCase() : '';
    const query = {};

    if (role) {
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role filter.' });
      }

      query.role = role;
    }

    const users = await User.find(query)
      .select('_id name email phone role preferredStylist profileImage createdAt')
      .sort({ name: 1, createdAt: -1 })
      .lean();

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Server Error: Could not fetch users.' });
  }
};

// Update user profile function
const updateUserProfile = async (req, res) => {
  let databaseUpdateCommitted = false;
  let profileUpdateSession = null;

  const rejectProfileUpdate = async (statusCode, message) => {
    await cleanupUploadedCloudinaryFile(req.file, 'Rejected profile image update cleanup');
    return res.status(statusCode).json({ success: false, message });
  };

  try {
    const {
      name,
      email,
      phone,
      preferredStylist,
      profileImage: requestedProfileImage,
      password,
      newPassword,
      currentPassword
    } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return rejectProfileUpdate(404, 'User not found');
    }

    if (requestedProfileImage !== undefined && !req.file) {
      const message = isBase64Image(requestedProfileImage)
        ? 'Base64 profile images are no longer accepted. Please upload an image file.'
        : 'Please upload profileImage as an image file.';

      return rejectProfileUpdate(400, message);
    }

    const normalizedName = name !== undefined ? String(name).trim() : undefined;
    const normalizedEmail = email !== undefined ? String(email).trim().toLowerCase() : undefined;
    const normalizedPhone = phone !== undefined ? String(phone).trim().replace(/[\s-]/g, '') : undefined;
    const nextPassword = newPassword || password;
    const uploadedProfileImage = req.file?.path;
    const uploadedProfileImagePublicId = req.file?.filename || '';
    const isEmailChange = normalizedEmail !== undefined
      && normalizedEmail !== String(user.email || '').trim().toLowerCase();
    let isCurrentPasswordVerified = false;

    if (normalizedName !== undefined && !normalizedName) {
      return rejectProfileUpdate(400, 'Name is required.');
    }

    if (normalizedEmail !== undefined) {
      if (!isValidEmail(normalizedEmail)) {
        return rejectProfileUpdate(400, 'Please enter a valid email address.');
      }

      if (isEmailChange) {
        if (!currentPassword) {
          return rejectProfileUpdate(400, 'Current password is required to update your email address.');
        }

        isCurrentPasswordVerified = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordVerified) {
          return rejectProfileUpdate(401, 'Current password is incorrect.');
        }
      }

      const emailOwner = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id }
      }).select('_id');

      if (emailOwner) {
        return rejectProfileUpdate(409, 'An account with this email already exists.');
      }
    }

    if (normalizedPhone !== undefined && normalizedPhone && !isValidPhoneNumber(normalizedPhone)) {
      return rejectProfileUpdate(400, 'Enter a valid Sri Lankan mobile number starting with +94 or 07.');
    }

    if (nextPassword) {
      if (!currentPassword) {
        return rejectProfileUpdate(401, 'Current password is required to update your password.');
      }

      if (!isCurrentPasswordVerified) {
        isCurrentPasswordVerified = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordVerified) {
          return rejectProfileUpdate(401, 'Current password is incorrect.');
        }
      }

      if (String(nextPassword).length < 8) {
        return rejectProfileUpdate(400, 'Password must be at least 8 characters long.');
      }
    }

    const previousPreferredStylist = user.preferredStylist?.toString() || null;
    const resolvedPreferredStylist = await resolvePreferredStylistId(preferredStylist);

    user.name = normalizedName !== undefined ? normalizedName : user.name;
    user.email = normalizedEmail !== undefined ? normalizedEmail : user.email;
    user.phone = normalizedPhone !== undefined ? normalizedPhone : user.phone;
    user.preferredStylist = resolvedPreferredStylist !== undefined
      ? resolvedPreferredStylist
      : user.preferredStylist;

    const replacedProfileAssets = [];

    if (uploadedProfileImage) {
      replacedProfileAssets.push({
        publicId: user.profileImagePublicId,
        imageUrl: user.profileImage,
        context: 'Old user profile image cleanup',
      });
      user.profileImage = uploadedProfileImage;
      user.profileImagePublicId = uploadedProfileImagePublicId;
    } else {
      user.profileImagePublicId = user.profileImagePublicId || resolveCloudinaryPublicId('', user.profileImage);
    }

    if (nextPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(nextPassword, salt);
      user.passwordChangedAt = new Date();
    }

    let staffDetails = null;
    if (user.role === 'staff') {
      staffDetails = await Staff.findOne({ userId: user._id });

      if (staffDetails) {
        if (uploadedProfileImage) {
          replacedProfileAssets.push({
            publicId: staffDetails.imagePublicId,
            imageUrl: staffDetails.imageUrl,
            context: 'Old staff profile image cleanup',
          });
        }

        staffDetails.name = user.name || staffDetails.name;
        staffDetails.imageUrl = uploadedProfileImage || staffDetails.imageUrl;
        staffDetails.imagePublicId = uploadedProfileImage
          ? uploadedProfileImagePublicId
          : staffDetails.imagePublicId || resolveCloudinaryPublicId('', staffDetails.imageUrl);
      }
    }

    const persistProfileDocuments = async (activeSession) => {
      const saveOptions = activeSession ? { session: activeSession } : undefined;
      await user.save(saveOptions);
      if (staffDetails) await staffDetails.save(saveOptions);
    };

    if (staffDetails) {
      profileUpdateSession = await mongoose.startSession();
      await profileUpdateSession.withTransaction(async () => {
        await persistProfileDocuments(profileUpdateSession);
      });
    } else {
      await persistProfileDocuments();
    }

    databaseUpdateCommitted = true;
    const updatedUser = user;
    const queuedPublicIds = new Set();

    replacedProfileAssets.forEach(({ publicId, imageUrl, context }) => {
      const resolvedPublicId = resolveCloudinaryPublicId(publicId, imageUrl);
      if (
        !resolvedPublicId
        || resolvedPublicId === uploadedProfileImagePublicId
        || queuedPublicIds.has(resolvedPublicId)
      ) return;

      queuedPublicIds.add(resolvedPublicId);
      queueCloudinaryAssetDeletion(publicId, imageUrl, context);
    });

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

    const mergedProfileImage = updatedUser.profileImage || staffDetails?.imageUrl || '';
    const profileUser = {
      _id: updatedUser._id,
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || '',
      preferredStylist: updatedUser.preferredStylist || '',
      profileImage: mergedProfileImage,
      role: updatedUser.role,
    };
    const mergedResponse = {
      ...profileUser,
      token: nextPassword
        ? generateToken(updatedUser)
        : req.headers.authorization ? req.headers.authorization.split(' ')[1] : '',
      message: nextPassword ? 'Password updated successfully' : 'Profile updated successfully',
      ...(nextPassword ? { user: profileUser } : {}),
      staffDetails,
      specialty: staffDetails?.specialty || '',
      workingHours: normalizeWorkingHours(staffDetails?.workingHours),
      offDays: normalizeOffDays(staffDetails?.offDays) || [],
      imageUrl: staffDetails?.imageUrl || updatedUser.profileImage || '',
    };

    res.json(mergedResponse);
  } catch (error) {
    if (!databaseUpdateCommitted) {
      await cleanupUploadedCloudinaryFile(req.file, 'Failed profile image update cleanup');
    }

    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    if (error?.name === 'ValidationError') {
      const message = Object.values(error.errors || {})[0]?.message || 'Please check your profile details.';
      return res.status(400).json({ message });
    }

    res.status(error.statusCode || 500).json({ message: error.message });
  } finally {
    if (profileUpdateSession) {
      await profileUpdateSession.endSession();
    }
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
      { returnDocument: 'after' }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Onboarding completed successfully.',
      user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
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

    const todayDateString = getTodayDateString();
    const { startDate: todayStartDate, endDate: tomorrowStartDate } = getDateWindow(todayDateString);
    const stylistFirstName = getFirstName(preferredStaff.name);
    const offDayName = getStaffOffDayName(preferredStaff, todayStartDate);

    if (offDayName) {
      return res.status(200).json({
        scenario: 'preferred_stylist_off_day',
        message: `${stylistFirstName} is off today (${offDayName}). Explore availability with another stylist or reserve your preferred slot for tomorrow or later this week.`,
        stylistName: preferredStaff.name,
        slotsOpen: 0,
        actualSlotsOpen: 0,
        hasPreferredStylist: true,
      });
    }

    const approvedLeave = await findApprovedLeaveForDate(preferredStaff, todayStartDate, tomorrowStartDate);

    if (approvedLeave) {
      const postLeaveBookingWindow = getPostLeaveBookingWindow(approvedLeave.endDate, todayStartDate);

      return res.status(200).json({
        scenario: 'preferred_stylist_on_leave',
        message: `${stylistFirstName} is on leave today. Explore availability with another stylist or reserve your preferred slot for ${postLeaveBookingWindow}.`,
        stylistName: preferredStaff.name,
        slotsOpen: 0,
        actualSlotsOpen: 0,
        hasPreferredStylist: true,
      });
    }

    const shortestService = await Service.findOne({ isActive: { $ne: false } })
      .sort({ duration: 1 })
      .select('duration')
      .lean();
    const serviceDuration = Number.isInteger(shortestService?.duration) && shortestService.duration > 0
      ? shortestService.duration
      : 60;

    const slots = await generateAvailableSlots({
      staffId: preferredStaff._id,
      date: todayDateString,
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
    getUsers,
    getMe,
    getProfile,
    updateUserProfile,
    completeOnboarding,
    getDashboardBanner,
    _test: {
      createGoogleLoginHandler,
      verifyGoogleIdToken,
    },
};
