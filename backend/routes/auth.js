const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, sendEmail, sanitizeInput, successResponse, errorResponse } = require('../utils/helpers');
const { sendWelcomeEmail, sendVerificationEmail } = require('../utils/emailService');
const whatsappService = require('../utils/whatsappService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Test route for debugging
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth routes are working',
    timestamp: new Date().toISOString()
  });
});

// Register user
router.post('/register', [
  body('name').isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters long'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('phone').isMobilePhone().withMessage('Please enter a valid phone number'),
  body('nationality').isLength({ min: 2 }).withMessage('Nationality must be at least 2 characters long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { name, email, password, phone, nationality, preferredLanguage } = req.body;
    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      phone: sanitizeInput(phone),
      nationality: sanitizeInput(nationality),
      preferredLanguage: preferredLanguage || 'en'
    };

    // Check if user already exists
    const existingUser = await User.findOne({ email: sanitizedData.email });
    if (existingUser) {
      return errorResponse(res, 'User already exists with this email', 400);
    }

    // Create user
    const user = await User.create({
      name: sanitizedData.name,
      email: sanitizedData.email,
      password,
      phone: sanitizedData.phone,
      nationality: sanitizedData.nationality,
      preferredLanguage: sanitizedData.preferredLanguage
    });

    // Generate verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

    // Send verification email
    try {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        verificationToken,
        verificationUrl
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate token
    const token = generateToken(user._id);

    successResponse(res, {
      user,
      token,
      message: 'Please check your email to verify your account'
    }, 'User registered successfully. Please verify your email.', 201);

  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, error.message, 400);
    }
    errorResponse(res, 'Registration failed', 500);
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email, password } = req.body;

    // Check if user exists and include password for verification
    const user = await User.findOne({ email: sanitizeInput(email) }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    successResponse(res, {
      user,
      token
    }, 'Login successful');

  } catch (error) {
    errorResponse(res, 'Login failed', 500);
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    successResponse(res, { user }, 'User data retrieved successfully');
  } catch (error) {
    errorResponse(res, 'Failed to get user data', 500);
  }
});

// Update user profile
router.put('/profile', protect, [
  body('email').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('phone').optional().isMobilePhone().withMessage('Please enter a valid phone number'),
  body('nationality').optional().isLength({ min: 2 }).withMessage('Nationality must be at least 2 characters long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email, phone, nationality, preferredLanguage } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (email) updateData.email = sanitizeInput(email);
    if (phone) updateData.phone = sanitizeInput(phone);
    if (nationality) updateData.nationality = sanitizeInput(nationality);
    if (preferredLanguage) updateData.preferredLanguage = preferredLanguage;

    // Check if email is being changed and if it already exists
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email: updateData.email });
      if (existingUser) {
        return errorResponse(res, 'Email already exists', 400);
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    successResponse(res, { user }, 'Profile updated successfully');

  } catch (error) {
    errorResponse(res, 'Failed to update profile', 500);
  }
});

// Change password
router.put('/change-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(currentPassword))) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    successResponse(res, null, 'Password changed successfully');

  } catch (error) {
    errorResponse(res, 'Failed to change password', 500);
  }
});

// Forgot password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email: sanitizeInput(email) });
    if (!user) {
      return errorResponse(res, 'No account found with this email address', 404);
    }

    // Generate password reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const hashedToken = require('crypto').createHash('sha256').update(resetToken).digest('hex');

    // Set token and expiry (15 minutes)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Create reset URL
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Send email (you'll need to implement this in emailService)
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request - Gaith Tours',
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2 style="color: #f97316;">Password Reset Request</h2>
            <p>Hello ${user.name},</p>
            <p>You have requested to reset your password. Please click the link below to reset your password:</p>
            <a href="${resetURL}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
            <p>This link will expire in 15 minutes.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br>Gaith Tours Team</p>
          </div>
        `
      });
    } catch (emailError) {
      // If email fails, remove the reset token
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return errorResponse(res, 'Failed to send reset email', 500);
    }

    successResponse(res, null, 'Password reset email sent');

  } catch (error) {
    errorResponse(res, 'Failed to process password reset request', 500);
  }
});

// Reset password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { token, password } = req.body;

    // Hash the token to compare with stored hash
    const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token that hasn't expired
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return errorResponse(res, 'Invalid or expired reset token', 400);
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    successResponse(res, null, 'Password reset successfully');

  } catch (error) {
    errorResponse(res, 'Failed to reset password', 500);
  }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid verification token that hasn't expired
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return errorResponse(res, 'Invalid or expired verification token', 400);
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email after successful verification
    try {
      await sendWelcomeEmail({
        email: user.email,
        name: user.name
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    successResponse(res, {
      verified: true,
      email: user.email
    }, 'Email verified successfully! Welcome to Gaith Tours.');

  } catch (error) {
    console.error('Email verification error:', error);
    errorResponse(res, 'Failed to verify email', 500);
  }
});

// Resend verification email
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email: sanitizeInput(email) });

    if (!user) {
      // Don't reveal if user exists or not for security
      return successResponse(res, null, 'If an account exists with this email, a verification link will be sent.');
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return errorResponse(res, 'Email is already verified', 400);
    }

    // Check if there's a recent verification email sent (rate limiting - 1 min)
    if (user.emailVerificationExpires &&
        new Date(user.emailVerificationExpires).getTime() > Date.now() + (23 * 60 * 60 * 1000)) {
      return errorResponse(res, 'Please wait a minute before requesting another verification email', 429);
    }

    // Generate new verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

    // Send verification email
    try {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        verificationToken,
        verificationUrl
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return errorResponse(res, 'Failed to send verification email', 500);
    }

    successResponse(res, null, 'Verification email sent successfully');

  } catch (error) {
    console.error('Resend verification error:', error);
    errorResponse(res, 'Failed to resend verification email', 500);
  }
});

// Send phone verification code via WhatsApp
router.post('/send-phone-code', [
  body('phone').isMobilePhone().withMessage('Please enter a valid phone number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { phone, language = 'ar' } = req.body;
    const sanitizedPhone = sanitizeInput(phone);

    // Check if there's a user with this phone to prevent abuse
    // For new registrations, we create a temp record or use session
    // For now, we'll create/update a pending verification record

    // Find or create a user record for this phone
    let user = await User.findOne({ phone: sanitizedPhone });

    // If no user exists yet, we need to handle this case
    // This can happen during registration - we'll create a temporary tracking
    if (!user) {
      // Check if there's a pending verification for this phone (without full user)
      // For social login users updating their phone, they should be authenticated
      // This endpoint is mainly for authenticated users or during social login flow
      return errorResponse(res, 'Please complete registration first or log in', 400);
    }

    // Rate limiting: check if we sent a code in the last 60 seconds
    if (user.phoneVerificationLastSent) {
      const timeSinceLastSent = Date.now() - new Date(user.phoneVerificationLastSent).getTime();
      const cooldownMs = 60 * 1000; // 60 seconds

      if (timeSinceLastSent < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastSent) / 1000);
        return errorResponse(res, `Please wait ${remainingSeconds} seconds before requesting a new code`, 429);
      }
    }

    // Generate verification code
    const code = user.generatePhoneVerificationCode();
    await user.save();

    // Send code via WhatsApp
    try {
      await whatsappService.sendVerificationCode(sanitizedPhone, code, language);
    } catch (whatsappError) {
      console.error('WhatsApp send error:', whatsappError);
      // Clear the verification fields since we couldn't send
      user.phoneVerificationCode = undefined;
      user.phoneVerificationExpires = undefined;
      user.phoneVerificationLastSent = undefined;
      await user.save();
      return errorResponse(res, 'Failed to send verification code. Please check your WhatsApp number.', 500);
    }

    successResponse(res, {
      codeSent: true,
      expiresIn: 600 // 10 minutes in seconds
    }, 'Verification code sent to your WhatsApp');

  } catch (error) {
    console.error('Send phone code error:', error);
    errorResponse(res, 'Failed to send verification code', 500);
  }
});

// Send phone verification code for authenticated users (social login flow)
router.post('/send-phone-code-auth', protect, [
  body('phone').custom((value) => {
    // Clean the phone number and validate basic format
    const cleaned = value.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?\d{8,15}$/.test(cleaned)) {
      throw new Error('Please enter a valid phone number');
    }
    return true;
  })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { phone, language = 'ar' } = req.body;
    const sanitizedPhone = sanitizeInput(phone);

    // Get the authenticated user
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Rate limiting: check if we sent a code in the last 60 seconds
    if (user.phoneVerificationLastSent) {
      const timeSinceLastSent = Date.now() - new Date(user.phoneVerificationLastSent).getTime();
      const cooldownMs = 60 * 1000; // 60 seconds

      if (timeSinceLastSent < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastSent) / 1000);
        return errorResponse(res, `Please wait ${remainingSeconds} seconds before requesting a new code`, 429);
      }
    }

    // Store the phone number temporarily for verification
    user.phone = sanitizedPhone;

    // Generate verification code
    const code = user.generatePhoneVerificationCode();
    await user.save();

    // Send code via WhatsApp
    try {
      await whatsappService.sendVerificationCode(sanitizedPhone, code, language);
    } catch (whatsappError) {
      console.error('WhatsApp send error:', whatsappError);
      // Clear the verification fields since we couldn't send
      user.phoneVerificationCode = undefined;
      user.phoneVerificationExpires = undefined;
      user.phoneVerificationLastSent = undefined;
      await user.save();
      return errorResponse(res, 'Failed to send verification code. Please check your WhatsApp number.', 500);
    }

    successResponse(res, {
      codeSent: true,
      expiresIn: 600 // 10 minutes in seconds
    }, 'Verification code sent to your WhatsApp');

  } catch (error) {
    console.error('Send phone code auth error:', error);
    errorResponse(res, 'Failed to send verification code', 500);
  }
});

// Verify phone code
router.post('/verify-phone-code', protect, [
  body('phone').custom((value) => {
    const cleaned = value.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?\d{8,15}$/.test(cleaned)) {
      throw new Error('Please enter a valid phone number');
    }
    return true;
  }),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Please enter a valid 6-digit code')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { phone, code } = req.body;
    const sanitizedPhone = sanitizeInput(phone);

    // Get the authenticated user
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Check if verification code exists and hasn't expired
    if (!user.phoneVerificationCode || !user.phoneVerificationExpires) {
      return errorResponse(res, 'No verification code found. Please request a new code.', 400);
    }

    // Check if code has expired
    if (new Date(user.phoneVerificationExpires) < Date.now()) {
      // Clear expired code
      user.phoneVerificationCode = undefined;
      user.phoneVerificationExpires = undefined;
      await user.save();
      return errorResponse(res, 'Verification code has expired. Please request a new code.', 400);
    }

    // Hash the entered code and compare
    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    if (hashedCode !== user.phoneVerificationCode) {
      return errorResponse(res, 'Invalid verification code. Please try again.', 400);
    }

    // Auto-detect nationality from phone country code
    const detectedNationality = getNationalityFromPhone(sanitizedPhone);

    // Code is valid - mark phone as verified
    user.phone = sanitizedPhone;
    user.isPhoneVerified = true;
    user.phoneVerificationCode = undefined;
    user.phoneVerificationExpires = undefined;
    user.phoneVerificationLastSent = undefined;

    // Set nationality if detected and not already set
    if (detectedNationality && (!user.nationality || user.nationality === '')) {
      user.nationality = detectedNationality;
    }

    await user.save();

    successResponse(res, {
      user,
      verified: true
    }, 'Phone number verified successfully');

  } catch (error) {
    console.error('Verify phone code error:', error);
    errorResponse(res, 'Failed to verify code', 500);
  }
});


// Social Login (Google/Facebook)
router.post('/social-login', async (req, res) => {
  try {
    const { provider, accessToken, userInfo } = req.body;

    if (!provider || !accessToken || !userInfo) {
      return errorResponse(res, 'Missing required fields', 400);
    }

    if (!['google', 'facebook'].includes(provider)) {
      return errorResponse(res, 'Invalid provider', 400);
    }

    const email = userInfo.email;
    const name = userInfo.name || userInfo.given_name || 'User';
    const socialId = userInfo.sub || userInfo.id;
    const profilePicture = userInfo.picture?.data?.url || userInfo.picture;

    if (!email) {
      return errorResponse(res, 'Email not provided by social provider', 400);
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update social provider info if not set
      if (!user.socialProvider) {
        user.socialProvider = provider;
        user.socialId = socialId;
        if (profilePicture) user.profilePicture = profilePicture;
        await user.save();
      }
    } else {
      // Create new user with social auth
      user = await User.create({
        name,
        email,
        socialProvider: provider,
        socialId,
        profilePicture,
        isEmailVerified: true // Social auth emails are pre-verified
      });
    }

    // Generate token
    const token = generateToken(user._id);

    successResponse(res, {
      user,
      token,
      isNewUser: !user.phone || user.phone === '+0000000000'
    }, 'Social login successful');

  } catch (error) {
    console.error('Social login error:', error);
    errorResponse(res, 'Social login failed', 500);
  }
});

// Country code to nationality mapping
const countryCodeToNationality = {
  '+966': 'Saudi Arabian',
  '+971': 'Emirati',
  '+20': 'Egyptian',
  '+962': 'Jordanian',
  '+965': 'Kuwaiti',
  '+974': 'Qatari',
  '+973': 'Bahraini',
  '+968': 'Omani',
  '+1': 'American',
  '+44': 'British',
  '+91': 'Indian',
  '+92': 'Pakistani',
  '+63': 'Filipino',
  '+90': 'Turkish',
  '+49': 'German',
  '+33': 'French',
  '+39': 'Italian',
  '+34': 'Spanish',
  '+61': 'Australian',
  '+81': 'Japanese',
  '+82': 'South Korean',
  '+86': 'Chinese',
  '+7': 'Russian',
  '+55': 'Brazilian',
  '+52': 'Mexican',
  '+27': 'South African',
  '+234': 'Nigerian',
  '+254': 'Kenyan',
  '+212': 'Moroccan',
  '+216': 'Tunisian',
  '+213': 'Algerian',
  '+961': 'Lebanese',
  '+963': 'Syrian',
  '+964': 'Iraqi',
  '+98': 'Iranian',
  '+60': 'Malaysian',
  '+65': 'Singaporean',
  '+66': 'Thai',
  '+62': 'Indonesian',
  '+84': 'Vietnamese',
};

// Function to get nationality from phone number
const getNationalityFromPhone = (phone) => {
  if (!phone) return null;

  // Sort by length (longer codes first) to match most specific code
  const sortedCodes = Object.keys(countryCodeToNationality).sort((a, b) => b.length - a.length);

  for (const code of sortedCodes) {
    if (phone.startsWith(code)) {
      return countryCodeToNationality[code];
    }
  }
  return null;
};

// Update phone number (for social login users)
router.put('/update-phone', protect, [
  body('phone').isMobilePhone().withMessage('Please enter a valid phone number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { phone } = req.body;
    const sanitizedPhone = sanitizeInput(phone);

    // Auto-detect nationality from phone country code
    const detectedNationality = getNationalityFromPhone(sanitizedPhone);

    // Build update object
    const updateData = { phone: sanitizedPhone };

    // Only set nationality if detected and user doesn't already have one
    const currentUser = await User.findById(req.user.id);
    if (detectedNationality && (!currentUser.nationality || currentUser.nationality === '')) {
      updateData.nationality = detectedNationality;
    }

    // Update user's phone number (and nationality if detected)
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, { user }, 'Phone number updated successfully');

  } catch (error) {
    console.error('Update phone error:', error);
    errorResponse(res, 'Failed to update phone number', 500);
  }
});

module.exports = router;
