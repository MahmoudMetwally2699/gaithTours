const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const { protect } = require('../middleware/auth');
const { sanitizeInput, successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// Get user profile (protected route)
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, { user }, 'User profile retrieved successfully');
  } catch (error) {
    console.error('Get profile error:', error);
    errorResponse(res, 'Failed to get user profile', 500);
  }
});

// Get user reservations
router.get('/reservations', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reservations = await Reservation.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'email phone nationality');

    const totalReservations = await Reservation.countDocuments({ user: req.user.id });
    const totalPages = Math.ceil(totalReservations / limit);

    successResponse(res, {
      reservations,
      pagination: {
        currentPage: page,
        totalPages,
        totalReservations,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }, 'Reservations retrieved successfully');

  } catch (error) {
    console.error('Get reservations error:', error);
    errorResponse(res, 'Failed to get reservations', 500);
  }
});

// Get single reservation
router.get('/reservations/:id', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('user', 'email phone nationality');

    if (!reservation) {
      return errorResponse(res, 'Reservation not found', 404);
    }

    successResponse(res, { reservation }, 'Reservation retrieved successfully');

  } catch (error) {
    console.error('Get reservation error:', error);
    errorResponse(res, 'Failed to get reservation', 500);
  }
});

// Update user profile
router.put('/profile', protect, [
  body('email').optional().isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('phone').optional().isMobilePhone().withMessage('Please enter a valid phone number'),
  body('nationality').optional().isLength({ min: 2 }).withMessage('Nationality must be at least 2 characters long'),
  body('preferredLanguage').optional().isIn(['en', 'ar']).withMessage('Language must be either en or ar')
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

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, { user }, 'Profile updated successfully');

  } catch (error) {
    console.error('Update profile error:', error);
    errorResponse(res, 'Failed to update profile', 500);
  }
});

// Update user search history
router.put('/history', protect, [
  body('destination').notEmpty().withMessage('Destination is required').trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { destination } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { lastSearchDestination: destination },
      { new: true }
    );

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, null, 'Search history updated successfully');

  } catch (error) {
    console.error('Update history error:', error);
    errorResponse(res, 'Failed to update search history', 500);
  }
});

// Delete user account
router.delete('/account', protect, async (req, res) => {
  try {
    // Delete all user reservations
    await Reservation.deleteMany({ user: req.user.id });

    // Delete user
    await User.findByIdAndDelete(req.user.id);

    successResponse(res, null, 'Account deleted successfully');

  } catch (error) {
    console.error('Delete account error:', error);
    errorResponse(res, 'Failed to delete account', 500);
  }
});

module.exports = router;
