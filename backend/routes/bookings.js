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
 *
 * IMPORTANT: RateHawk API Limitation
 * - Can only book multiple rooms of the SAME type in one request
 * - To book different room types, frontend must make separate booking requests
 * - Each booking request should contain one room type with quantity
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

    // Initialize booking variables that might be overridden by test hotel logic
    let bookingAmount = totalPrice;
    let bookingCurrency = currency || 'USD';
    let bookHash;
    let isExpiredHash = false;
    let matchHashToUse = selectedRate.matchHash;

    // ============================================
    // SPECIAL HANDLING FOR ETG TEST HOTEL (hid=8473727)
    // For RateHawk certification, we need to:
    // 1. Fetch fresh rates with dates 30 days in the future
    // 2. Select a REFUNDABLE rate (with free_cancellation_before)
    // 3. Use the fresh book_hash for booking
    // ============================================
    const isTestHotel = hotelId === 'test_hotel_do_not_book' || hotelId === '8473727' || hotelName?.toLowerCase().includes('test');

    if (isTestHotel) {
      console.log('🧪 TEST HOTEL DETECTED - Using certification booking flow');
      console.log('   This automatically fetches fresh rates with 30-day future dates');

      // Calculate dates 30 days from now (required for refundable rates in sandbox)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const checkoutDate = new Date(futureDate);
      checkoutDate.setDate(checkoutDate.getDate() + 2);

      const testDates = {
        checkin: futureDate.toISOString().split('T')[0],
        checkout: checkoutDate.toISOString().split('T')[0]
      };

      console.log(`   📅 Using FIXED dates: ${testDates.checkin} to ${testDates.checkout}`);

      try {
        // Step 1: Fetch fresh rates from HP API with future dates
        console.log('   🔄 Fetching fresh rates from HP API...');
        const hotelDetails = await rateHawkService.getHotelDetails(8473727, {
          checkin: testDates.checkin,
          checkout: testDates.checkout,
          adults: 2,
          children: [],
          residency: 'gb',
          currency: 'USD'
        });

        if (!hotelDetails || !hotelDetails.rates || hotelDetails.rates.length === 0) {
          console.error('❌ No rates found for test hotel');
          return errorResponse(res, 'No rates available for test hotel', 400);
        }

        // Step 2: Find a REFUNDABLE rate (with free_cancellation_before in the future)
        console.log(`   📊 Found ${hotelDetails.rates.length} rates, looking for refundable one...`);
        const now = new Date();

        const refundableRate = hotelDetails.rates.find(rate => {
          const freeCancelDate = rate.free_cancellation_before;
          if (freeCancelDate) {
            const cancelDate = new Date(freeCancelDate);
            return cancelDate > now;
          }
          return false;
        });

        if (!refundableRate) {
          console.error('❌ No refundable rates found for test hotel');
          return errorResponse(res, 'No refundable rates available for test hotel. RateHawk sandbox requires refundable rates.', 400);
        }

        console.log(`   ✅ Found refundable rate: ${refundableRate.roomName || 'Standard Room'}`);
        console.log(`   💰 Price: ${refundableRate.price} ${refundableRate.currency || 'USD'}`);
        console.log(`   🆓 Free cancellation before: ${refundableRate.free_cancellation_before}`);

        // Update booking amount and currency to match the new rate
        // IMPORTANT: Test hotel booking (2 nights) has different price than original search (1 night)
        // We MUST use the rate price for the booking to succeed
        bookingAmount = refundableRate.price;
        bookingCurrency = refundableRate.currency || 'USD';
        console.log(`   💳 Updated booking amount to: ${bookingAmount} ${bookingCurrency}`);


        // Step 3: Get the hash to prebook (book_hash or match_hash - both need prebook!)
        // IMPORTANT: HP API returns book_hash with "h-" prefix which STILL needs to be prebooked
        // Only "p-" prefix hashes can be used directly for booking form
        const hashToPrebook = refundableRate.book_hash || refundableRate.match_hash;

        if (!hashToPrebook) {
          console.error('❌ No book_hash or match_hash found in refundable rate');
          return errorResponse(res, 'Could not get booking hash for test hotel', 400);
        }

        console.log(`   📦 Hash to prebook: ${hashToPrebook.substring(0, 30)}...`);

        // Step 4: ALWAYS prebook to get the "p-" prefixed hash
        console.log('   🔄 Prebooking to get real book_hash (p- prefix)...');
        try {
          const prebookResult = await rateHawkService.prebook(hashToPrebook, 'en');

          if (prebookResult.success && prebookResult.book_hash) {
            bookHash = prebookResult.book_hash;
            console.log(`   ✅ Prebook successful! Real book_hash: ${bookHash.substring(0, 30)}...`);

            // Update price from prebook result (authoritative source)
            // This is CRITICAL because prebook price might differ slightly from search/details price (e.g. rounding diffs)
            const prebookRate = prebookResult.data?.hotels?.[0]?.rates?.[0];
            const paymentType = prebookRate?.payment_options?.payment_types?.[0];

            if (paymentType?.amount) {
              bookingAmount = paymentType.amount;
              bookingCurrency = paymentType.currency_code || bookingCurrency;
              console.log(`   💳 Updated booking amount from PREBOOK to: ${bookingAmount} ${bookingCurrency}`);
            }
          } else {
            console.error('❌ Test hotel prebook failed');
            return errorResponse(res, 'Failed to prebook test hotel rate', 400);
          }
        } catch (prebookError) {
          console.error('❌ Test hotel prebook error:', prebookError.message);
          return errorResponse(res, `Failed to prebook test hotel: ${prebookError.message}`, 500);
        }

      } catch (error) {
        console.error('❌ Error fetching test hotel rates:', error.message);
        return errorResponse(res, `Failed to get test hotel rates: ${error.message}`, 500);
      }
    }

    // Step 0: Prebook to get book_hash from match_hash (if not already obtained)
    if (!bookHash) {
      console.log('🔄 Step 0: Prebooking rate to get book_hash...');

      try {
        const prebookResult = await rateHawkService.prebook(matchHashToUse, 'en');

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
          city: hotelCity || hotelAddress || 'Unknown',
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

      // TEMP: Commented out due to MongoDB quota limit
      // await reservation.save();

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
            city: hotelCity || hotelAddress || 'Unknown',
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

        // TEMP: Commented out due to MongoDB quota limit
        // await reservation.save();

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

    // Construct rooms array for RateHawk
    // If numberOfRooms > 1, we need to provide guest details for EACH room
    // Currently we only have lead guest info, so we replicate it for all rooms
    // In a future update, we should collect guest names for each room separately
    const roomsCount = parseInt(numberOfRooms || '1');
    const roomsPayload = [];

    for (let i = 0; i < roomsCount; i++) {
      roomsPayload.push({
        guests: [
          {
            first_name: firstName,
            last_name: lastName
          }
        ]
      });
    }

    console.log(`   👥 Preparing booking for ${roomsCount} room(s)`);

    const startBookingResult = await rateHawkService.startBooking(partnerOrderId, {
      user: {
        email: guestEmail || req.user?.email,
        phone: cleanPhone,
        comment: specialRequests || ''
      },
      supplier_data: {
        first_name_original: firstName,
        last_name_original: lastName,
        phone: cleanPhone,
        email: guestEmail || req.user?.email
      },
      rooms: roomsPayload, // Use the constructed array
      language: 'en',
      payment_type: {
        type: 'deposit',
        // Total price should be correct (already calculated for all rooms)
        amount: Number(bookingAmount).toFixed(2),
        currency_code: bookingCurrency
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
      // Log detailed error for investigation (Issue #1)
      console.error('❌ Booking failed with status:', bookingStatus.status);
      console.error('   Partner Order ID:', partnerOrderId);
      console.error('   Full response:', JSON.stringify(bookingStatus, null, 2));

      // Provide more specific error message
      const errorDetails = bookingStatus.error || bookingStatus.message || bookingStatus.status;
      return errorResponse(res, `Booking failed: ${errorDetails}. Order ID: ${partnerOrderId}`, 500);
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
        city: hotelCity || hotelAddress || 'Unknown',
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

    // TEMP: Commented out due to MongoDB quota limit
    // await reservation.save();

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

    // TEMP: Commented out due to MongoDB quota limit
    // await invoice.save();

    // Update reservation with invoice reference
    // TEMP: Commented out due to MongoDB quota limit
    // reservation.invoice = invoice._id;
    // await reservation.save();

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

/**
 * @route   POST /api/bookings/create-multi
 * @desc    Create multiple bookings for different room types (handles API limitation)
 * @access  Private
 *
 * This endpoint handles the RateHawk API limitation where different room types
 * cannot be booked in a single request. It:
 * 1. Groups rooms by type
 * 2. Makes separate booking requests for each room type
 * 3. Links all bookings with a shared session ID
 * 4. Returns all booking results
 */
router.post('/create-multi', async (req, res) => {
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
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      paymentMethod,
      selectedRooms // Array of room objects with rate details
    } = req.body;

    // Validate required fields
    if (!hotelId || !hotelName || !checkInDate || !checkOutDate || !selectedRooms || selectedRooms.length === 0) {
      return errorResponse(res, 'Missing required booking information', 400);
    }

    // For guest bookings, require guest information
    if (!req.user && (!guestName || !guestEmail || !guestPhone)) {
      return errorResponse(res, 'Guest bookings require name, email, and phone number', 400);
    }

    console.log('🎯 Starting multi-room booking process...');
    console.log(`📦 ${selectedRooms.length} room selections to process`);

    // Group rooms by room type (same room type can be booked together)
    const roomsByType = new Map();
    selectedRooms.forEach(room => {
      const key = room.room_name || room.roomName;
      if (!roomsByType.has(key)) {
        roomsByType.set(key, []);
      }
      roomsByType.get(key).push(room);
    });

    console.log(`📋 Grouped into ${roomsByType.size} separate booking(s)`);

    // Generate a shared session ID to link all bookings
    const { v4: uuidv4 } = require('uuid');
    const bookingSessionId = uuidv4();

    // Results array to track all bookings
    const bookingResults = [];
    const errors = [];

    // Initialize RateHawk service
    const rateHawkService = require('../utils/RateHawkService');

    // Process each room type separately
    for (const [roomType, rooms] of roomsByType.entries()) {
      console.log(`\n🏨 Booking ${rooms.length} room(s) of type: ${roomType}`);

      try {
        // Calculate total for this room type
        const totalRoomCount = rooms.reduce((sum, r) => sum + (r.count || 1), 0);
        const totalPrice = rooms.reduce((sum, r) => sum + (parseFloat(r.price) * (r.count || 1)), 0);
        const currency = rooms[0].currency || 'USD';
        const primaryRoom = rooms[0];
        const matchHash = primaryRoom.match_hash || primaryRoom.matchHash;

        console.log(`   💰 Total: ${totalPrice} ${currency} for ${totalRoomCount} room(s)`);

        // Step 1: Prebook to get book_hash
        console.log(`   🔄 Step 1: Prebooking rate...`);
        const prebookResult = await rateHawkService.prebook(matchHash, 'en');

        if (!prebookResult.success || !prebookResult.book_hash) {
          throw new Error('Failed to prebook rate - hash may be expired');
        }

        const bookHash = prebookResult.book_hash;
        console.log(`   ✅ Prebook successful`);

        // Step 2: Create booking with RateHawk
        const partnerOrderId = `${bookingSessionId}-${roomType.replace(/\s+/g, '-')}`;
        console.log(`   📦 Step 2: Creating booking with order ID: ${partnerOrderId}`);

        // Build rooms payload for booking
        const roomsPayload = [];
        for (let i = 0; i < totalRoomCount; i++) {
          roomsPayload.push({
            guests: [
              {
                first_name: guestName?.split(' ')[0] || 'Guest',
                last_name: guestName?.split(' ').slice(1).join(' ') || 'User'
              }
            ]
          });
        }

        await rateHawkService.createBooking({
          partner_order_id: partnerOrderId,
          book_hash: bookHash,
          user: {
            email: guestEmail,
            phone: guestPhone || '+1234567890'
          },
          rooms: roomsPayload,
          language: 'en',
          payment_type: {
            type: 'deposit',
            amount: Number(totalPrice).toFixed(2),
            currency_code: currency
          }
        });

        console.log(`   ✅ Booking created, checking status...`);

        // Step 3: Poll for booking status
        let bookingStatus;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          bookingStatus = await rateHawkService.checkBookingStatus(partnerOrderId);
          console.log(`   Status check ${attempts + 1}/${maxAttempts}:`, bookingStatus.status);

          if (bookingStatus.status === 'ok' || bookingStatus.status === 'error') {
            break;
          }
          attempts++;
        }

        if (bookingStatus.status !== 'ok') {
          throw new Error(`Booking failed: ${bookingStatus.error || bookingStatus.status}`);
        }

        console.log(`   ✅ Booking confirmed!`);

        // Create reservation in database
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

        const reservation = new Reservation({
          user: req.user?._id || null,
          touristName: guestName || 'Guest',
          email: guestEmail,
          phone: guestPhone || '+1234567890',
          nationality: req.user?.nationality || 'US',
          hotel: {
            name: hotelName,
            address: hotelAddress || '',
            city: hotelCity || 'Unknown',
            country: hotelCountry || 'Unknown',
            rating: parseFloat(hotelRating) || 0,
            image: hotelImage || '',
            rateHawkMatchHash: matchHash
          },
          checkInDate: checkIn,
          checkOutDate: checkOut,
          numberOfNights: nights,
          numberOfRooms: totalRoomCount,
          numberOfAdults: totalRoomCount * 2,
          roomType: roomType,
          stayType: 'Leisure',
          meal: primaryRoom.meal || 'nomeal',
          paymentMethod: paymentMethod || 'pending',
          specialRequests: `Multi-booking session: ${bookingSessionId}. ${specialRequests || ''}`,
          status: 'confirmed',
          totalPrice: totalPrice,
          currency: currency,
          ratehawkOrderId: bookingStatus.order_id,
          ratehawkStatus: bookingStatus.status,
          bookingSessionId: bookingSessionId,
          isPartOfMultiBooking: true,
          roomCount: totalRoomCount
        });

        await reservation.save();

        bookingResults.push({
          roomType,
          roomCount: totalRoomCount,
          totalPrice,
          currency,
          status: 'completed',
          reservationId: reservation._id,
          ratehawkOrderId: bookingStatus.order_id
        });

        console.log(`   ✅ Reservation saved: ${reservation._id}`);

      } catch (error) {
        console.error(`   ❌ Error booking ${roomType}:`, error.message);
        errors.push({
          roomType,
          error: error.message
        });
      }
    }

    // Return results
    if (errors.length === 0) {
      successResponse(res, {
        bookingSessionId,
        bookings: bookingResults,
        message: `${roomsByType.size} booking request(s) prepared successfully`
      }, 'Multi-room booking initiated');
    } else {
      return errorResponse(res, {
        bookingSessionId,
        completed: bookingResults.filter(b => b.status === 'completed'),
        failed: errors,
        message: `Some bookings failed`
      }, 'Partial booking failure', 207); // Multi-status
    }

  } catch (error) {
    console.error('Multi-booking error:', error);
    errorResponse(res, 'Failed to process multi-room booking', 500);
  }
});

/**
 * @route   GET /api/bookings/session/:sessionId
 * @desc    Get all bookings in a session
 * @access  Private
 */
router.get('/session/:sessionId', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const reservations = await Reservation.find({ bookingSessionId: sessionId })
      .sort({ createdAt: -1 });

    if (reservations.length === 0) {
      return errorResponse(res, 'No bookings found for this session', 404);
    }

    // Check if user owns at least one booking in this session or is admin
    const userOwnsBooking = reservations.some(r =>
      r.user && r.user.toString() === req.user._id.toString()
    );

    if (!userOwnsBooking && req.user.role !== 'admin') {
      return errorResponse(res, 'Not authorized to view this booking session', 403);
    }

    successResponse(res, {
      sessionId,
      bookings: reservations,
      summary: {
        totalBookings: reservations.length,
        totalRooms: reservations.reduce((sum, r) => sum + (r.roomCount || r.numberOfRooms || 1), 0),
        totalPrice: reservations.reduce((sum, r) => sum + (r.totalPrice || 0), 0),
        currency: reservations[0]?.currency || 'USD',
        allConfirmed: reservations.every(r => r.status === 'confirmed')
      }
    }, 'Session bookings retrieved successfully');

  } catch (error) {
    console.error('Get session bookings error:', error);
    errorResponse(res, 'Failed to retrieve session bookings', 500);
  }
});

/**
 * @route   POST /api/bookings/session/:sessionId/cancel
 * @desc    Cancel all bookings in a session
 * @access  Private
 */
router.post('/session/:sessionId/cancel', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const reservations = await Reservation.find({ bookingSessionId: sessionId });

    if (reservations.length === 0) {
      return errorResponse(res, 'No bookings found for this session', 404);
    }

    // Check if user owns at least one booking in this session or is admin
    const userOwnsBooking = reservations.some(r =>
      r.user && r.user.toString() === req.user._id.toString()
    );

    if (!userOwnsBooking && req.user.role !== 'admin') {
      return errorResponse(res, 'Not authorized to cancel this booking session', 403);
    }

    // Update all bookings to cancelled status
    const updateResults = await Promise.all(
      reservations.map(async (reservation) => {
        try {
          // TODO: Call RateHawk cancellation API here
          // const cancellationResult = await rateHawkService.cancelBooking(reservation.ratehawkOrderId);

          reservation.status = 'cancelled';
          reservation.notes = (reservation.notes || '') + `\n[Cancelled as part of session ${sessionId}]`;
          await reservation.save();

          return {
            reservationId: reservation._id,
            ratehawkOrderId: reservation.ratehawkOrderId,
            status: 'cancelled',
            roomType: reservation.roomType
          };
        } catch (error) {
          return {
            reservationId: reservation._id,
            status: 'error',
            error: error.message
          };
        }
      })
    );

    successResponse(res, {
      sessionId,
      cancelledBookings: updateResults.filter(r => r.status === 'cancelled').length,
      failedCancellations: updateResults.filter(r => r.status === 'error').length,
      results: updateResults
    }, 'Session cancellation processed');

  } catch (error) {
    console.error('Cancel session error:', error);
    errorResponse(res, 'Failed to cancel session bookings', 500);
  }
});

module.exports = router;
