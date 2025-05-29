const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendEmail, sanitizeInput, successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// Create new reservation
router.post('/', protect, [
  body('touristName').trim().isLength({ min: 2 }).withMessage('Tourist name must be at least 2 characters long'),
  body('phone').isMobilePhone().withMessage('Please enter a valid phone number'),
  body('nationality').trim().isLength({ min: 2 }).withMessage('Nationality must be at least 2 characters long'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('hotel.name').trim().isLength({ min: 2 }).withMessage('Hotel name is required'),
  body('hotel.address').trim().isLength({ min: 5 }).withMessage('Hotel address is required'),
  body('hotel.city').trim().isLength({ min: 2 }).withMessage('Hotel city is required'),
  body('hotel.country').trim().isLength({ min: 2 }).withMessage('Hotel country is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const {
      touristName,
      phone,
      nationality,
      email,
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
      notes: notes ? sanitizeInput(notes) : undefined
    };

    // Create reservation
    const reservation = await Reservation.create({
      user: req.user.id,
      touristName: sanitizedData.touristName,
      phone: sanitizedData.phone,
      nationality: sanitizedData.nationality,
      email: sanitizedData.email,
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
    });

    // Populate user data for email
    await reservation.populate('user', 'email phone nationality');

    // Send confirmation email to user
    try {
      await sendEmail({
        email: sanitizedData.email,
        subject: 'Hotel Reservation Confirmation - Gaith Tours',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb;">Gaith Tours</h1>
              <h2 style="color: #1f2937;">Reservation Confirmation</h2>
            </div>

            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #374151; margin-bottom: 15px;">Reservation Details</h3>
              <p><strong>Reservation ID:</strong> ${reservation._id}</p>
              <p><strong>Tourist Name:</strong> ${sanitizedData.touristName}</p>
              <p><strong>Email:</strong> ${sanitizedData.email}</p>
              <p><strong>Phone:</strong> ${sanitizedData.phone}</p>
              <p><strong>Nationality:</strong> ${sanitizedData.nationality}</p>
              ${numberOfGuests ? `<p><strong>Number of Guests:</strong> ${numberOfGuests}</p>` : ''}
            </div>

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #374151; margin-bottom: 15px;">Hotel Information</h3>
              <p><strong>Hotel Name:</strong> ${hotel.name}</p>
              <p><strong>Address:</strong> ${hotel.address}</p>
              <p><strong>City:</strong> ${hotel.city}</p>
              <p><strong>Country:</strong> ${hotel.country}</p>
              ${hotel.rating ? `<p><strong>Rating:</strong> ${hotel.rating}/10</p>` : ''}
            </div>

            ${checkInDate && checkOutDate ? `
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #374151; margin-bottom: 15px;">Stay Details</h3>
                <p><strong>Check-in Date:</strong> ${new Date(checkInDate).toLocaleDateString()}</p>
                <p><strong>Check-out Date:</strong> ${new Date(checkOutDate).toLocaleDateString()}</p>
              </div>
            ` : ''}

            ${notes ? `
              <div style="background-color: #fefce8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #374151; margin-bottom: 15px;">Additional Notes</h3>
                <p>${notes}</p>
              </div>
            ` : ''}

            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #991b1b;"><strong>Important:</strong> This is a booking request. Our team will contact you within 24 hours to confirm your reservation and provide payment details.</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <p>Thank you for choosing Gaith Tours!</p>
              <p style="color: #6b7280;">If you have any questions, please contact us at ${process.env.EMAIL_FROM}</p>
            </div>
          </div>
        `
      });
    } catch (emailError) {
      console.error('User confirmation email failed:', emailError);
    }

    // Send notification email to agency
    try {
      await sendEmail({
        email: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        subject: 'New Hotel Reservation Request - Gaith Tours',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">New Hotel Reservation Request</h2>

            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3>Customer Details</h3>
              <p><strong>Name:</strong> ${sanitizedData.touristName}</p>
              <p><strong>Email:</strong> ${sanitizedData.email}</p>
              <p><strong>Phone:</strong> ${sanitizedData.phone}</p>
              <p><strong>Nationality:</strong> ${sanitizedData.nationality}</p>
              <p><strong>Number of Guests:</strong> ${numberOfGuests || 1}</p>
            </div>

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3>Hotel Details</h3>
              <p><strong>Hotel:</strong> ${hotel.name}</p>
              <p><strong>Address:</strong> ${hotel.address}, ${hotel.city}, ${hotel.country}</p>
              ${hotel.rating ? `<p><strong>Rating:</strong> ${hotel.rating}/10</p>` : ''}
            </div>

            ${checkInDate && checkOutDate ? `
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3>Stay Details</h3>
                <p><strong>Check-in:</strong> ${new Date(checkInDate).toLocaleDateString()}</p>
                <p><strong>Check-out:</strong> ${new Date(checkOutDate).toLocaleDateString()}</p>
              </div>
            ` : ''}

            ${notes ? `
              <div style="background-color: #fefce8; padding: 20px; border-radius: 8px;">
                <h3>Additional Notes</h3>
                <p>${notes}</p>
              </div>
            ` : ''}

            <p><strong>Reservation ID:</strong> ${reservation._id}</p>
            <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Agency notification email failed:', emailError);
    }

    // Populate user data for response
    await reservation.populate('user', 'email phone nationality');

    successResponse(res, { reservation }, 'Reservation created successfully', 201);

  } catch (error) {
    console.error('Create reservation error:', error);
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
    }

    // Send cancellation email
    try {
      await sendEmail({
        email: reservation.email,
        subject: 'Reservation Cancellation - Gaith Tours',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">Reservation Cancelled</h2>
            <p>Your reservation (ID: ${reservation._id}) has been cancelled.</p>
            <p>If you have any questions, please contact us.</p>
            <p>Thank you for choosing Gaith Tours.</p>
          </div>
        `
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
