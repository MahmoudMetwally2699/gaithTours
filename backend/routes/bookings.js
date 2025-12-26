const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Reservation = require('../models/Reservation');
const Invoice = require('../models/Invoice');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

/**
 * @route   POST /api/bookings/create
 * @desc    Create a new hotel booking reservation
 * @access  Private
 */
router.post('/create', async (req, res) => {
  try {
    const {
      hotelId,
      hotelName,
      hotelAddress,
      hotelCity,
      hotelCountry,
      hotelRating,
      hotelImage,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      roomType,
      guestName,
      guestEmail,
      guestPhone,
      totalPrice,
      currency,
      specialRequests,
      stayType,
      paymentMethod,
      selectedRate
    } = req.body;

    // Validate required fields
    if (!hotelId || !hotelName || !checkInDate || !checkOutDate || !selectedRate?.matchHash) {
      return errorResponse(res, 'Missing required booking information', 400);
    }

    // For guest bookings (no req.user), require guest information
    if (!req.user && (!guestName || !guestEmail || !guestPhone)) {
      return errorResponse(res, 'Guest bookings require name, email, and phone number', 400);
    }

    console.log('🎯 Starting RateHawk booking process...');
    console.log('Match Hash:', selectedRate.matchHash);

    // Generate unique partner order ID
    const { v4: uuidv4 } = require('uuid');
    const partnerOrderId = uuidv4();

    // Initialize RateHawk service
    const rateHawkService = require('../utils/RateHawkService');

    // Step 0: Prebook to get book_hash from match_hash
    console.log('🔄 Step 0: Prebooking rate to get book_hash...');

    let bookHash;
    let isExpiredHash = false;

    try {
      const prebookResult = await rateHawkService.prebook(selectedRate.matchHash, 'en');

      if (!prebookResult.success || !prebookResult.book_hash) {
        console.warn('⚠️ Prebook failed, hash may be expired');
        isExpiredHash = true;
      } else {
        bookHash = prebookResult.book_hash;
        console.log('✅ Prebook successful, Book Hash:', bookHash);
      }
    } catch (error) {
      console.warn('⚠️ Prebook error (hash likely expired):', error.response?.data?.error || error.message);
      isExpiredHash = true;
    }

    // If hash is expired, create reservation in pending status without RateHawk booking
    if (isExpiredHash) {
      console.log('📝 Creating reservation in pending status (expired hash)...');

      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      // Clean phone number (remove duplicate country codes)
      let cleanPhone = guestPhone || req.user.phone || '';
      if (cleanPhone) {
        // Remove duplicate country codes like "+971+1" -> "+971"
        cleanPhone = cleanPhone.replace(/(\+\d+)\+\d+/, '$1');
        // Remove formatting characters except + and digits
        cleanPhone = cleanPhone.replace(/[^\d+]/g, '');
      }

      const reservation = new Reservation({
        user: req.user?._id || null, // null for guest bookings
        touristName: guestName || req.user?.name || 'Guest',
        email: guestEmail || req.user?.email,
        phone: cleanPhone || '+1234567890',
        nationality: req.user?.nationality || 'US',
        hotel: {
          id: hotelId,
          name: hotelName,
          address: hotelAddress || '',
          city: hotelCity || '',
          country: hotelCountry || hotelCity || 'Unknown', // Use country, city, or fallback
          rating: parseFloat(hotelRating) || 0,
          image: hotelImage || '',
          rateHawkMatchHash: selectedRate.matchHash
        },
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfNights: nights,
        numberOfRooms: 1,
        numberOfAdults: numberOfGuests || 2,
        numberOfChildren: 0,
        roomType: selectedRate.roomName || roomType || 'Standard Room',
        stayType: stayType || 'Leisure',
        meal: selectedRate.meal || 'nomeal',
        paymentMethod: paymentMethod || 'pending',
        specialRequests: specialRequests || '',
        status: 'pending',
        totalPrice: totalPrice,
        currency: currency || 'USD',
        ratehawkStatus: 'hash_expired'
      });

      await reservation.save();

      return successResponse(res, {
        reservation: {
          id: reservation._id,
          hotelName: reservation.hotel.name,
          checkIn: reservation.checkInDate,
          checkOut: reservation.checkOutDate,
          nights: reservation.numberOfNights,
          totalPrice: reservation.totalPrice,
          currency: reservation.currency,
          status: reservation.status
        },
        warning: 'Rate availability expired. Reservation created in pending status for manual confirmation.'
      }, 'Reservation created - pending confirmation');
    }

    // Step 1: Create booking form
    console.log('📝 Step 1: Creating booking form...');
    const bookingFormResult = await rateHawkService.createBooking(bookHash, {
      partner_order_id: partnerOrderId,
      user_ip: req.ip || '0.0.0.0',
      language: 'en'
    });

    if (!bookingFormResult.success) {
      // Handle sandbox mode
      if (bookingFormResult.sandbox_mode) {
        console.log('⚠️ Sandbox mode: Creating reservation without actual booking');

        // Create reservation in sandbox mode
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

        const reservation = new Reservation({
          user: req.user?._id || null,
          touristName: guestName || req.user?.name || 'Guest',
          email: guestEmail || req.user?.email,
          phone: guestPhone || req.user?.phone || '+1234567890',
          nationality: req.user?.nationality || 'US',
          hotel: {
            id: hotelId,
            name: hotelName,
            address: hotelAddress || '',
            city: hotelCity || '',
            country: hotelCountry || hotelCity || 'Unknown', // Use country, city, or fallback
            rating: parseFloat(hotelRating) || 0,
            image: hotelImage || '',
            rateHawkMatchHash: selectedRate.matchHash
          },
          checkInDate: checkIn,
          checkOutDate: checkOut,
          numberOfNights: nights,
          numberOfRooms: 1,
          numberOfAdults: numberOfGuests || 2,
          numberOfChildren: 0,
          roomType: selectedRate.roomName || roomType || 'Standard Room',
          stayType: stayType || 'Leisure',
          meal: selectedRate.meal || 'nomeal',
          paymentMethod: paymentMethod || 'pending',
          specialRequests: specialRequests || '',
          status: 'pending',
          totalPrice: totalPrice,
          currency: currency || 'USD',
          ratehawkOrderId: partnerOrderId,
          ratehawkStatus: 'sandbox'
        });

        await reservation.save();

        return successResponse(res, {
          reservation: {
            id: reservation._id,
            hotelName: reservation.hotel.name,
            checkIn: reservation.checkInDate,
            checkOut: reservation.checkOutDate,
            nights: reservation.numberOfNights,
            totalPrice: reservation.totalPrice,
            currency: reservation.currency,
            status: reservation.status
          },
          sandbox_mode: true
        }, 'Booking created in sandbox mode');
      }

      return errorResponse(res, 'Failed to create booking form', 500);
    }

    console.log('✅ Booking form created, Order ID:', bookingFormResult.order_id);

    // Step 2: Start booking with guest details
    console.log('🚀 Step 2: Starting booking process...');

    // Parse guest name
    const nameParts = (guestName || req.user?.name || 'Guest User').split(' ');
    const firstName = nameParts[0] || 'Guest';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    // Clean phone number (remove duplicate country codes)
    let cleanPhone = guestPhone || req.user.phone || '';
    if (cleanPhone) {
      // Remove duplicate country codes like "+971+1" -> "+971"
      cleanPhone = cleanPhone.replace(/(\+\d+)\+\d+/, '$1');
      // Remove formatting characters except + and digits
      cleanPhone = cleanPhone.replace(/[^\d+]/g, '');
    }

    const startBookingResult = await rateHawkService.startBooking(partnerOrderId, {
      user: {
        email: guestEmail || req.user.email,
        phone: cleanPhone
      },
      rooms: [
        {
          guests: [
            {
              first_name: firstName,
              last_name: lastName
            }
          ]
        }
      ],
      language: 'en',
      payment_type: {
        type: 'deposit', // Changed to deposit to match test script
        amount: totalPrice.toFixed(2),
        currency_code: currency || 'USD'
      }
    });

    console.log('✅ Booking started, waiting for confirmation...');

    // Step 3: Poll for booking status
    console.log('⏳ Step 3: Checking booking status...');
    let bookingStatus;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks

      bookingStatus = await rateHawkService.checkBookingStatus(partnerOrderId);
      console.log(`Status check ${attempts + 1}/${maxAttempts}:`, bookingStatus.status);

      if (bookingStatus.status === 'ok' || bookingStatus.status === 'error') {
        break;
      }

      attempts++;
    }

    if (bookingStatus.status !== 'ok') {
      return errorResponse(res, `Booking failed: ${bookingStatus.status}`, 500);
    }

    console.log('✅ Booking confirmed!');

    // Calculate total nights and price
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    // cleanPhone is already calculated above

    // Create reservation in our database
    const reservation = new Reservation({
      user: req.user?._id || null,
      touristName: guestName || req.user?.name || 'Guest',
      email: guestEmail || req.user?.email,
      phone: cleanPhone || '+1234567890',
      nationality: req.user?.nationality || 'US',
      hotel: {
        id: hotelId,
        name: hotelName,
        address: hotelAddress || '',
        city: hotelCity || '',
        country: hotelCountry || hotelCity || 'Unknown', // Use country, city, or fallback
        rating: parseFloat(hotelRating) || 0,
        image: hotelImage || '',
        rateHawkMatchHash: selectedRate.matchHash
      },
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfNights: nights,
      numberOfRooms: 1,
      numberOfAdults: numberOfGuests || 2,
      numberOfChildren: 0,
      roomType: selectedRate.roomName || roomType || 'Standard Room',
      stayType: stayType || 'Leisure',
      meal: selectedRate.meal || 'nomeal',
      paymentMethod: paymentMethod || 'pending',
      specialRequests: specialRequests || '',
      status: 'confirmed',
      totalPrice: totalPrice,
      currency: currency || 'USD',
      ratehawkOrderId: bookingStatus.order_id,
      ratehawkStatus: bookingStatus.status
    });

    await reservation.save();

    // Generate invoice
    const invoiceNumber = `INV-${Date.now()}-${reservation._id.toString().slice(-6).toUpperCase()}`;
    const Invoice = require('../models/Invoice');

    const invoice = new Invoice({
      invoiceNumber,
      user: req.user?._id || null,
      reservation: reservation._id,
      clientName: guestName || req.user?.name || 'Guest',
      clientEmail: guestEmail || req.user?.email,
      clientPhone: guestPhone || req.user?.phone || '',
      items: [
        {
          description: `${hotelName} - ${selectedRate.roomName || 'Room'}`,
          quantity: nights,
          unitPrice: parseFloat(selectedRate.price || totalPrice / nights),
          total: totalPrice
        }
      ],
      subtotal: totalPrice,
      tax: 0,
      discount: 0,
      total: totalPrice,
      currency: currency || 'USD',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await invoice.save();

    // Update reservation with invoice reference
    reservation.invoice = invoice._id;
    await reservation.save();

    successResponse(res, {
      reservation: {
        id: reservation._id,
        hotelName: reservation.hotel.name,
        checkIn: reservation.checkInDate,
        checkOut: reservation.checkOutDate,
        nights: reservation.numberOfNights,
        totalPrice: reservation.totalPrice,
        currency: reservation.currency,
        status: reservation.status,
        ratehawkOrderId: reservation.ratehawkOrderId
      },
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        currency: invoice.currency,
        dueDate: invoice.dueDate
      }
    }, 'Booking created successfully');

  } catch (error) {
    console.error('Booking creation error:', error);

    // Check if it's a Mongoose validation error
    if (error.name === 'ValidationError') {
      // Extract validation error messages
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));

      const errorMessage = validationErrors.map(err => `${err.field}: ${err.message}`).join(', ');
      return errorResponse(res, `Validation failed: ${errorMessage}`, 400);
    }

    // For other errors, send generic message
    errorResponse(res, error.message || 'Failed to create booking', 500);
  }
});

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking details
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('invoice');

    if (!reservation) {
      return errorResponse(res, 'Booking not found', 404);
    }

    // Check if user owns this booking or is admin
    if (reservation.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 'Not authorized to view this booking', 403);
    }

    successResponse(res, { reservation }, 'Booking retrieved successfully');

  } catch (error) {
    console.error('Get booking error:', error);
    errorResponse(res, 'Failed to retrieve booking', 500);
  }
});

/**
 * @route   GET /api/bookings/user/:userId
 * @desc    Get user's booking history
 * @access  Private
 */
router.get('/user/:userId', protect, async (req, res) => {
  try {
    // Check if user is requesting their own bookings or is admin
    if (req.params.userId !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 'Not authorized', 403);
    }

    const reservations = await Reservation.find({ user: req.params.userId })
      .populate('invoice')
      .sort({ createdAt: -1 });

    successResponse(res, { reservations }, 'Booking history retrieved successfully');

  } catch (error) {
    console.error('Get booking history error:', error);
    errorResponse(res, 'Failed to retrieve booking history', 500);
  }
});

module.exports = router;
