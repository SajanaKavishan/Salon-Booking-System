const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Staff = require('../models/Staff');
const sendEmail = require('../utils/sendEmail');
const {
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

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const genericSuccessMessage = 'If an account exists with that email, a password reset link has been sent.';

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(200).json({ success: true, message: genericSuccessMessage });
    }

    const configuredFrontendUrl = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)[0] || '';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && !configuredFrontendUrl) {
      throw new Error(
        'Critical configuration error: FRONTEND_URL or CLIENT_URL must be configured for password reset links in production.'
      );
    }

    const frontendUrl = configuredFrontendUrl || req.headers.origin || 'http://localhost:5173';

    if (!configuredFrontendUrl) {
      console.error(
        `FRONTEND_URL and CLIENT_URL are not configured. Falling back to ${frontendUrl} for password reset links.`
      );
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

    const message = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
        <h2 style="color:#111827;">Reset your Salon DEES password</h2>
        <p>You requested a password reset. This secure link will expire in 10 minutes.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#d4af37;color:#111827;padding:12px 18px;text-decoration:none;border-radius:6px;font-weight:700;">
            Reset Password
          </a>
        </p>
        <p>If the button does not work, copy and paste this URL into your browser:</p>
        <p style="word-break:break-all;">${resetUrl}</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Salon DEES password reset',
        message,
        text: `Reset your Salon DEES password using this link: ${resetUrl}. This link expires in 10 minutes.`,
      });

      return res.status(200).json({ success: true, message: genericSuccessMessage });
    } catch (emailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({
        message: 'Email could not be sent. Please try again later.',
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return res.status(200).json({ message: 'Password reset successful. You can now sign in.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  login,
  forgotPassword,
  resetPassword
};
