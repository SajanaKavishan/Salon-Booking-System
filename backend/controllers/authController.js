const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Staff = require('../models/Staff');
const sendEmail = require('../utils/sendEmail');
const {
  normalizeWorkingHours,
} = require('../utils/staffSchedule');

// Utility function to generate a JWT token for a user. The token includes the user's ID and role, and it is signed with a secret key from the environment variables. The token expires in 30 days.
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

// Controller function to handle user login. It validates the provided email and password, checks if the user exists, and verifies the password. If successful, it generates a JWT token and returns user details along with the token. For staff users, it also retrieves additional details such as profile image, specialty, working hours, and off days.
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

// Controller function to handle password reset requests. It generates a secure token for password reset, saves it to the user's record with an expiration time, and sends an email with a reset link. The function ensures that the frontend URL is properly configured for production environments and handles errors gracefully.
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

    if (user.resetPasswordExpire && (user.resetPasswordExpire.getTime() - Date.now() > 5 * 60 * 1000)) {
      return res.status(429).json({
        message: 'A password reset email was recently sent. Please wait 5 minutes before trying again.',
      });
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

    const clientUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || req.headers.origin || 'http://localhost:5173';

    if (!configuredFrontendUrl) {
      console.error(
        `FRONTEND_URL and CLIENT_URL are not configured. Falling back to ${clientUrl} for password reset links.`
      );
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    const resetUrl = `${clientUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

    const message = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Salon DEES Password Reset</title>
      </head>
      <body style="background-color: #f4f5f7; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 15px; -webkit-font-smoothing: antialiased;">

        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);">
                
                <!-- Full-Width Banner Header -->
                <tr>
                  <td align="center" style="padding: 0; margin: 0; background-color: #070708; border-bottom: 1px solid #e5e7eb;">
                    <img src="https://i.imgur.com/pM8tFyY.jpeg" alt="Salon DEES Banner" width="580" style="width: 100%; max-width: 580px; height: auto; display: block; border: 0; margin: 0; padding: 0;" />
                  </td>
                </tr>

                <!-- Content Section -->
                <tr>
                  <td align="left" style="padding: 35px 40px 30px 40px;">
                    <p style="color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 10px 0;">
                      Account Security
                    </p>
                    
                    <h1 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 16px 0;">
                      Reset your password
                    </h1>
                    
                    <p style="color: #374151; font-size: 15px; line-height: 24px; margin: 0 0 25px 0;">
                      Hello, we received a request to reset the password for your Salon DEES account. Click the button below to securely set up a new password:
                    </p>

                    <!-- Action Button (Gold & Black) -->
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center" bgcolor="#d4af37" style="border-radius: 6px;">
                          <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 13px 32px; font-size: 14px; font-weight: 700; color: #000000; text-decoration: none; border-radius: 6px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #6b7280; font-size: 14px; line-height: 22px; margin: 0 0 20px 0;">
                      For security reasons, this link will expire in <b>10 minutes</b>. If you did not request this change, please ignore this email or contact our support team immediately.
                    </p>

                    <!-- Troubleshooting Link -->
                    <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 25px 0 5px 0; border-top: 1px solid #f0f0f0; padding-top: 20px;">
                      If you're having trouble clicking the button, copy and paste this URL into your web browser:
                    </p>
                    <p style="margin: 0; word-break: break-all;">
                      <a href="${resetUrl}" target="_blank" style="color: #2563eb; font-size: 12px; text-decoration: underline;">
                        ${resetUrl}
                      </a>
                    </p>
                  </td>
                </tr>

                <!-- Footer Section -->
                <tr>
                  <td align="left" style="background-color: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      This message was sent automatically by the <b>Salon DEES Support Team</b>.
                    </p>
                    <p style="color: #9ca3af; font-size: 11px; margin: 6px 0 0 0;">
                      &copy; 2026 Salon DEES. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Salon DEES password reset',
        html: message,
        text: `Reset your Salon DEES account password using this link: ${resetUrl}. This link expires in 10 minutes.`
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

// Controller function to handle password reset requests. It validates the reset token and updates the user's password.
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
