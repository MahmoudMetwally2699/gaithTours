const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendEmail, sanitizeInput, successResponse, errorResponse } = require('../utils/helpers');
const { sendReservationConfirmation, sendAgencyNotification, sendCancellationEmail } = require('../utils/emailService');

const router = express.Router();

// Helper functions for better formatting
const getRoomTypeLabel = (type) => {
  const typeMap = {
    single: 'Single Room',
    double: 'Double Room',
    twin: 'Twin Room',
    triple: 'Triple Room',
    quad: 'Quad Room',
    suite: 'Suite',
    family: 'Family Room',
    deluxe: 'Deluxe Room'
  };
  return typeMap[type] || type;
};

const getStayTypeLabel = (type) => {
  const typeMap = {
    room_only: 'Room Only',
    bed_breakfast: 'Bed & Breakfast',
    half_board: 'Half Board',
    full_board: 'Full Board',
    all_inclusive: 'All Inclusive'
  };
  return typeMap[type] || type;
};

// Create new reservation
router.post('/', protect, [
  body('touristName').trim().isLength({ min: 2 }).withMessage('Tourist name must be at least 2 characters long'),
  body('phone').isLength({ min: 8 }).withMessage('Please enter a valid phone number'),
  body('nationality').trim().isLength({ min: 2 }).withMessage('Nationality must be at least 2 characters long'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('roomType').isIn(['single', 'double', 'twin', 'triple', 'quad', 'suite', 'family', 'deluxe']).withMessage('Invalid room type'),
  body('stayType').isIn(['room_only', 'bed_breakfast', 'half_board', 'full_board', 'all_inclusive']).withMessage('Invalid stay type'),
  body('paymentMethod').trim().isLength({ min: 2 }).withMessage('Payment method is required'),
  body('hotel.name').trim().isLength({ min: 2 }).withMessage('Hotel name is required'),
  body('hotel.address').trim().isLength({ min: 5 }).withMessage('Hotel address is required'),
  body('hotel.city').trim().isLength({ min: 2 }).withMessage('Hotel city is required'),
  body('hotel.country').trim().isLength({ min: 2 }).withMessage('Hotel country is required')
], async (req, res) => {
  try {
    // Log the incoming request data for debugging
    console.log('Reservation request body:', JSON.stringify(req.body, null, 2));

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const {
      touristName,
      phone,
      nationality,
      email,
      expectedCheckInTime,
      roomType,
      stayType,
      paymentMethod,
      guests,
      hotel,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      notes
    } = req.body;

    // Sanitize inputs
    const sanitizedData = {
      touristName: sanitizeInput(touristName),
      phone: sanitizeInput(phone),
      nationality: sanitizeInput(nationality),
      email: sanitizeInput(email),
      expectedCheckInTime: expectedCheckInTime ? sanitizeInput(expectedCheckInTime) : undefined,
      roomType: sanitizeInput(roomType),
      stayType: sanitizeInput(stayType),
      paymentMethod: sanitizeInput(paymentMethod),
      guests: guests && Array.isArray(guests) ? guests.map(guest => ({
        fullName: sanitizeInput(guest.fullName),
        phoneNumber: sanitizeInput(guest.phoneNumber)
      })) : [],
      notes: notes ? sanitizeInput(notes) : undefined    };

    // Log the data that will be sent to MongoDB
    const reservationData = {
      user: req.user.id,
      touristName: sanitizedData.touristName,
      phone: sanitizedData.phone,
      nationality: sanitizedData.nationality,
      email: sanitizedData.email,
      expectedCheckInTime: sanitizedData.expectedCheckInTime,
      roomType: sanitizedData.roomType,
      stayType: sanitizedData.stayType,
      paymentMethod: sanitizedData.paymentMethod,
      guests: sanitizedData.guests,
      hotel: {
        name: sanitizeInput(hotel.name),
        address: sanitizeInput(hotel.address),
        city: sanitizeInput(hotel.city),
        country: sanitizeInput(hotel.country),
        coordinates: hotel.coordinates,
        rating: hotel.rating,
        image: hotel.image,
        hotelId: hotel.hotelId
      },
      checkInDate: checkInDate ? new Date(checkInDate) : undefined,
      checkOutDate: checkOutDate ? new Date(checkOutDate) : undefined,
      numberOfGuests: numberOfGuests || 1,
      notes: sanitizedData.notes
    };

    console.log('Data being sent to MongoDB:', JSON.stringify(reservationData, null, 2));

    // Create reservation
    const reservation = await Reservation.create(reservationData);

    // Populate user data for email
    await reservation.populate('user', 'email phone nationality');    // Send confirmation email to user
    try {
      await sendReservationConfirmation({
        reservation,
        touristName: sanitizedData.touristName,
        email: sanitizedData.email,
        phone: sanitizedData.phone,
        nationality: sanitizedData.nationality,
        expectedCheckInTime: sanitizedData.expectedCheckInTime,
        roomType: sanitizedData.roomType,
        stayType: sanitizedData.stayType,
        paymentMethod: sanitizedData.paymentMethod,
        numberOfGuests: numberOfGuests || 1,
        guests: sanitizedData.guests,
        hotel,
        checkInDate,
        checkOutDate,
        notes: sanitizedData.notes
      });
    } catch (emailError) {
      console.error('User confirmation email failed:', emailError);
    }

    // Send notification email to agency
    try {
      await sendAgencyNotification({
        reservation,
        touristName: sanitizedData.touristName,
        email: sanitizedData.email,
        phone: sanitizedData.phone,
        nationality: sanitizedData.nationality,
        expectedCheckInTime: sanitizedData.expectedCheckInTime,
        roomType: sanitizedData.roomType,
        stayType: sanitizedData.stayType,
        paymentMethod: sanitizedData.paymentMethod,
        numberOfGuests: numberOfGuests || 1,
        guests: sanitizedData.guests,
        hotel,
        checkInDate,
        checkOutDate,
        notes: sanitizedData.notes
      });
    } catch (emailError) {
      console.error('Agency notification email failed:', emailError);
    }

    // Populate user data for response
    await reservation.populate('user', 'email phone nationality');

    successResponse(res, { reservation }, 'Reservation created successfully', 201);
  } catch (error) {
    console.error('Create reservation error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    // If it's a MongoDB validation error, log the details
    if (error.name === 'ValidationError') {
      console.error('MongoDB validation errors:', error.errors);
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      console.error('Formatted validation errors:', validationErrors);
      return errorResponse(res, 'Validation failed', 400, validationErrors);
    }

    errorResponse(res, 'Failed to create reservation', 500);
  }
});

// Get user reservations
router.get('/', protect, async (req, res) => {
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
router.get('/:id', protect, async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return errorResponse(res, 'Invalid reservation ID format', 400);
    }

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

// Update reservation status (for admin use or future features)
router.put('/:id/status', protect, [
  body('status').isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('Invalid status')
], async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return errorResponse(res, 'Invalid reservation ID format', 400);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { status } = req.body;

    const reservation = await Reservation.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { status },
      { new: true, runValidators: true }
    ).populate('user', 'email phone nationality');

    if (!reservation) {
      return errorResponse(res, 'Reservation not found', 404);
    }

    successResponse(res, { reservation }, 'Reservation status updated successfully');

  } catch (error) {
    console.error('Update reservation error:', error);
    errorResponse(res, 'Failed to update reservation', 500);
  }
});

// Cancel reservation
router.delete('/:id', protect, async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return errorResponse(res, 'Invalid reservation ID format', 400);
    }

    const reservation = await Reservation.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { status: 'cancelled' },
      { new: true }
    );

    if (!reservation) {
      return errorResponse(res, 'Reservation not found', 404);
    }    // Send cancellation email
    try {
      await sendCancellationEmail({
        email: reservation.email,
        reservationId: reservation._id
      });
    } catch (emailError) {
      console.error('Cancellation email failed:', emailError);
    }

    successResponse(res, { reservation }, 'Reservation cancelled successfully');

  } catch (error) {
    console.error('Cancel reservation error:', error);
    errorResponse(res, 'Failed to cancel reservation', 500);
  }
});

module.exports = router;
