const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, sendEmail, sanitizeInput, successResponse, errorResponse } = require('../utils/helpers');
const { protect } = require('../middleware/auth');

const router = express.Router();

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
    console.log('=== REGISTRATION REQUEST START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    console.log('Validation passed successfully');
    const { name, email, password, phone, nationality, preferredLanguage } = req.body;
    console.log('Extracted fields:', { name, email, phone, nationality, preferredLanguage });    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      phone: sanitizeInput(phone),
      nationality: sanitizeInput(nationality),
      preferredLanguage: preferredLanguage || 'en'
    };
    console.log('Sanitized data:', JSON.stringify(sanitizedData, null, 2));

    // Check if user already exists
    console.log('Checking if user exists with email:', sanitizedData.email);
    const existingUser = await User.findOne({ email: sanitizedData.email });
    if (existingUser) {
      console.log('User already exists:', existingUser._id);
      return errorResponse(res, 'User already exists with this email', 400);
    }
    console.log('No existing user found - proceeding with creation');

    // Create user
    console.log('Creating user with data:', {
      name: sanitizedData.name,
      email: sanitizedData.email,
      phone: sanitizedData.phone,
      nationality: sanitizedData.nationality,
      preferredLanguage: sanitizedData.preferredLanguage
    });

    const user = await User.create({
      name: sanitizedData.name,
      email: sanitizedData.email,
      password,
      phone: sanitizedData.phone,
      nationality: sanitizedData.nationality,
      preferredLanguage: sanitizedData.preferredLanguage
    });
    console.log('User created successfully:', user._id);    // Generate token
    const token = generateToken(user._id);
    console.log('Token generated successfully');

    // Send welcome email
    try {
      console.log('Attempting to send welcome email to:', user.email);
      await sendEmail({
        email: user.email,
        subject: 'Welcome to Gaith Tours!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to Gaith Tours!</h2>
            <p>Dear ${user.name},</p>
            <p>Thank you for registering with Gaith Tours. We're excited to help you plan your next adventure!</p>
            <p>You can now browse and book hotels through our platform.</p>
            <p>Happy travels!</p>
            <p>Best regards,<br>The Gaith Tours Team</p>
          </div>
        `
      });
      console.log('Welcome email sent successfully');
    } catch (emailError) {
      console.error('Welcome email sending failed:', emailError);
      // Don't fail registration if email fails
    }

    console.log('Sending success response');
    successResponse(res, {
      user,
      token
    }, 'User registered successfully', 201);
    console.log('=== REGISTRATION REQUEST END ===');

  } catch (error) {
    console.error('=== REGISTRATION ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.name === 'ValidationError') {
      console.error('Mongoose validation errors:', error.errors);
    }
    console.error('=== END REGISTRATION ERROR ===');
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
    console.error('Login error:', error);
    errorResponse(res, 'Login failed', 500);
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    successResponse(res, { user }, 'User data retrieved successfully');
  } catch (error) {
    console.error('Get user error:', error);
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
    console.error('Profile update error:', error);
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
    console.error('Change password error:', error);
    errorResponse(res, 'Failed to change password', 500);
  }
});

module.exports = router;
