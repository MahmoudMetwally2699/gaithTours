const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, sendEmail, sanitizeInput, successResponse, errorResponse } = require('../utils/helpers');
const { sendWelcomeEmail } = require('../utils/emailService');
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
    // Generate token
    const token = generateToken(user._id);
    // Send welcome email
    try {
      await sendWelcomeEmail({
        email: user.email,
        name: user.name
      });
    } catch (emailError) {
      // Don't fail registration if email fails
    }

    successResponse(res, {
      user,
      token
    }, 'User registered successfully', 201);

  } catch (error) {
    if (error.name === 'ValidationError') {
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

module.exports = router;
