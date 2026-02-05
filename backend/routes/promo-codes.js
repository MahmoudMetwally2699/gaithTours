const express = require('express');
const router = express.Router();
const PromoCode = require('../models/PromoCode');
const { protect, admin } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * @route   POST /api/promo-codes/validate
 * @desc    Validate a promo code for a booking
 * @access  Protected - User must be signed in to use promo codes
 */
router.post('/validate', protect, async (req, res) => {
  try {
    const { code, bookingValue, hotelId, destination } = req.body;
    const userId = req.user._id; // Get user ID from authenticated user

    if (!code) {
      return errorResponse(res, 'Promo code is required', 400);
    }

    if (!bookingValue || bookingValue <= 0) {
      return errorResponse(res, 'Valid booking value is required', 400);
    }

    // Find and validate the code
    const result = await PromoCode.findValidCode(code);
    if (!result.valid) {
      return errorResponse(res, result.message, 400);
    }

    const promoCode = result.promoCode;

    // Check if user can use this code (per-user limit check)
    const userCheck = promoCode.canUserUse(userId);
    if (!userCheck.canUse) {
      return errorResponse(res, userCheck.message, 400);
    }

    // Check hotel restrictions
    if (promoCode.applicableHotels && promoCode.applicableHotels.length > 0) {
      if (!hotelId || !promoCode.applicableHotels.includes(hotelId)) {
        return errorResponse(res, 'This promo code is not valid for this hotel', 400);
      }
    }

    // Check destination restrictions
    if (promoCode.applicableDestinations && promoCode.applicableDestinations.length > 0) {
      if (!destination || !promoCode.applicableDestinations.some(d =>
        d.toLowerCase() === destination.toLowerCase()
      )) {
        return errorResponse(res, 'This promo code is not valid for this destination', 400);
      }
    }

    // Calculate discount
    const discountResult = promoCode.calculateDiscount(bookingValue);
    if (!discountResult.valid) {
      return errorResponse(res, discountResult.message, 400);
    }

    successResponse(res, {
      code: promoCode.code,
      description: promoCode.description,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      ...discountResult
    }, 'Promo code is valid');

  } catch (error) {
    console.error('Promo code validation error:', error);
    errorResponse(res, 'Failed to validate promo code', 500);
  }
});

/**
 * @route   POST /api/promo-codes/apply
 * @desc    Apply a promo code to a booking (records usage)
 * @access  Public
 */
router.post('/apply', async (req, res) => {
  try {
    const { code, bookingValue, bookingId, userId } = req.body;

    if (!code || !bookingValue) {
      return errorResponse(res, 'Code and booking value are required', 400);
    }

    // Find and validate
    const result = await PromoCode.findValidCode(code);
    if (!result.valid) {
      return errorResponse(res, result.message, 400);
    }

    const promoCode = result.promoCode;

    // Check user limits
    if (userId) {
      const userCheck = promoCode.canUserUse(userId);
      if (!userCheck.canUse) {
        return errorResponse(res, userCheck.message, 400);
      }
    }

    // Calculate discount
    const discountResult = promoCode.calculateDiscount(bookingValue);
    if (!discountResult.valid) {
      return errorResponse(res, discountResult.message, 400);
    }

    // Record usage
    promoCode.usageCount += 1;
    promoCode.usedBy.push({
      user: userId || null,
      bookingId: bookingId || null,
      discountApplied: discountResult.discount
    });
    await promoCode.save();

    successResponse(res, {
      code: promoCode.code,
      ...discountResult,
      applied: true
    }, 'Promo code applied successfully');

  } catch (error) {
    console.error('Promo code apply error:', error);
    errorResponse(res, 'Failed to apply promo code', 500);
  }
});

const HotelContent = require('../models/HotelContent');

// ============ ADMIN ROUTES ============

/**
 * @route   GET /api/promo-codes/options/hotels
 * @desc    Search hotels for dropdown options
 * @access  Admin
 */
router.get('/options/hotels', protect, admin, async (req, res) => {
  try {
    const { search, ids } = req.query;
    const query = {};

    if (ids) {
       const idList = ids.split(',');
       const numericIds = idList.map(id => Number(id)).filter(n => !isNaN(n));
       query.$or = [
          { hid: { $in: numericIds } },
          { hotelId: { $in: idList } }
       ];
    } else if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const hotels = await HotelContent.find(query)
      .select('hid hotelId name city')
      .limit(ids ? 100 : 20);

    successResponse(res, { hotels }, 'Hotels retrieved');
  } catch (error) {
    console.error('Error fetching hotel options:', error);
    errorResponse(res, 'Failed to fetch hotel options', 500);
  }
});

/**
 * @route   GET /api/promo-codes/options/destinations
 * @desc    Get unique destinations for dropdown options
 * @access  Admin
 */
router.get('/options/destinations', protect, admin, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    // If search is provided, filter using regex, otherwise just distinct
    if (search) {
       query = { city: { $regex: search, $options: 'i' } };
       const destinations = await HotelContent.find(query).distinct('city');
       return successResponse(res, { destinations: destinations.filter(Boolean).sort() }, 'Destinations retrieved');
    }

    const destinations = await HotelContent.distinct('city');
    successResponse(res, { destinations: destinations.filter(Boolean).sort() }, 'Destinations retrieved');
  } catch (error) {
    console.error('Error fetching destination options:', error);
    errorResponse(res, 'Failed to fetch destination options', 500);
  }
});


/**
 * @route   GET /api/promo-codes
 * @desc    Get all promo codes (admin)
 * @access  Admin
 */
router.get('/', protect, admin, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    const query = {};

    // Filter by type (standard or referral)
    if (type && ['standard', 'referral'].includes(type)) {
      query.type = type;
    }

    if (status === 'active') {
      query.isActive = true;
      query.validUntil = { $gte: new Date() };
    } else if (status === 'expired') {
      query.$or = [
        { isActive: false },
        { validUntil: { $lt: new Date() } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [promoCodes, total] = await Promise.all([
      PromoCode.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email'),
      PromoCode.countDocuments(query)
    ]);

    successResponse(res, {
      promoCodes,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    }, 'Promo codes retrieved successfully');

  } catch (error) {
    console.error('Get promo codes error:', error);
    errorResponse(res, 'Failed to get promo codes', 500);
  }
});

/**
 * @route   POST /api/promo-codes
 * @desc    Create a new promo code (admin)
 * @access  Admin
 */
router.post('/', protect, admin, async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minBookingValue,
      maxDiscount,
      currency,
      validFrom,
      validUntil,
      usageLimit,
      perUserLimit,
      applicableHotels,
      applicableDestinations,
      applicableMinStars,
      // New fields for referral type
      type = 'standard',
      partnerInfo
    } = req.body;

    // Check if code already exists
    const existingCode = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      return errorResponse(res, 'Promo code already exists', 400);
    }

    // Validate referral type requirements
    if (type === 'referral' && (!partnerInfo || !partnerInfo.name)) {
      return errorResponse(res, 'Partner name is required for referral codes', 400);
    }

    const promoCode = new PromoCode({
      code,
      description,
      discountType,
      discountValue,
      minBookingValue,
      maxDiscount,
      currency,
      validFrom,
      validUntil,
      usageLimit,
      perUserLimit,
      applicableHotels,
      applicableDestinations,
      applicableMinStars,
      type,
      partnerInfo: type === 'referral' ? partnerInfo : undefined,
      createdBy: req.user._id
    });

    await promoCode.save();

    successResponse(res, { promoCode }, 'Promo code created successfully', 201);

  } catch (error) {
    console.error('Create promo code error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return errorResponse(res, messages.join(', '), 400);
    }
    errorResponse(res, 'Failed to create promo code', 500);
  }
});

/**
 * @route   PUT /api/promo-codes/:id
 * @desc    Update a promo code (admin)
 * @access  Admin
 */
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow changing the code itself (to prevent breaking existing references)
    delete updates.code;
    delete updates.usageCount;
    delete updates.usedBy;
    delete updates.createdBy;

    const promoCode = await PromoCode.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!promoCode) {
      return errorResponse(res, 'Promo code not found', 404);
    }

    successResponse(res, { promoCode }, 'Promo code updated successfully');

  } catch (error) {
    console.error('Update promo code error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return errorResponse(res, messages.join(', '), 400);
    }
    errorResponse(res, 'Failed to update promo code', 500);
  }
});

/**
 * @route   DELETE /api/promo-codes/:id
 * @desc    Delete a promo code (admin)
 * @access  Admin
 */
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    const promoCode = await PromoCode.findByIdAndDelete(id);

    if (!promoCode) {
      return errorResponse(res, 'Promo code not found', 404);
    }

    successResponse(res, { deleted: true }, 'Promo code deleted successfully');

  } catch (error) {
    console.error('Delete promo code error:', error);
    errorResponse(res, 'Failed to delete promo code', 500);
  }
});

/**
 * @route   GET /api/promo-codes/:id/stats
 * @desc    Get usage statistics for a promo code (admin)
 * @access  Admin
 */
router.get('/:id/stats', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    const promoCode = await PromoCode.findById(id)
      .populate('usedBy.user', 'name email')
      .populate('usedBy.bookingId', 'touristName hotel.name totalPrice');

    if (!promoCode) {
      return errorResponse(res, 'Promo code not found', 404);
    }

    const totalDiscount = promoCode.usedBy.reduce((sum, u) => sum + (u.discountApplied || 0), 0);

    successResponse(res, {
      code: promoCode.code,
      usageCount: promoCode.usageCount,
      usageLimit: promoCode.usageLimit,
      totalDiscountGiven: totalDiscount,
      currency: promoCode.currency,
      usageHistory: promoCode.usedBy.slice(-50) // Last 50 uses
    }, 'Promo code stats retrieved');

  } catch (error) {
    console.error('Get promo code stats error:', error);
    errorResponse(res, 'Failed to get promo code stats', 500);
  }
});

/**
 * @route   GET /api/promo-codes/:id/referral-stats
 * @desc    Get referral stats including commission details (admin)
 * @access  Admin
 */
router.get('/:id/referral-stats', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;

    const promoCode = await PromoCode.findById(id)
      .populate('referralBookings.bookingId', 'touristName hotel.name totalPrice createdAt');

    if (!promoCode) {
      return errorResponse(res, 'Promo code not found', 404);
    }

    if (promoCode.type !== 'referral') {
      return errorResponse(res, 'This is not a referral code', 400);
    }

    // Calculate commission stats
    const totalEarned = promoCode.totalCommissionEarned || 0;
    const paidCommissions = promoCode.referralBookings
      .filter(b => b.commissionPaid)
      .reduce((sum, b) => sum + (b.partnerCommission || 0), 0);
    const pendingCommissions = totalEarned - paidCommissions;

    successResponse(res, {
      code: promoCode.code,
      partnerInfo: promoCode.partnerInfo,
      totalBookings: promoCode.referralBookings.length,
      totalCommissionEarned: totalEarned,
      paidCommissions,
      pendingCommissions,
      currency: promoCode.currency,
      referralBookings: promoCode.referralBookings.slice(-50) // Last 50 bookings
    }, 'Referral stats retrieved');

  } catch (error) {
    console.error('Get referral stats error:', error);
    errorResponse(res, 'Failed to get referral stats', 500);
  }
});

/**
 * @route   PUT /api/promo-codes/:id/mark-commission-paid
 * @desc    Mark specific referral booking commissions as paid (admin)
 * @access  Admin
 */
router.put('/:id/mark-commission-paid', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { bookingIds } = req.body; // Array of referralBooking _id's to mark as paid

    const promoCode = await PromoCode.findById(id);

    if (!promoCode) {
      return errorResponse(res, 'Promo code not found', 404);
    }

    if (promoCode.type !== 'referral') {
      return errorResponse(res, 'This is not a referral code', 400);
    }

    let markedCount = 0;
    const now = new Date();

    promoCode.referralBookings.forEach(booking => {
      if (bookingIds && bookingIds.includes(booking._id.toString())) {
        if (!booking.commissionPaid) {
          booking.commissionPaid = true;
          booking.paidAt = now;
          markedCount++;
        }
      }
    });

    // If no specific bookingIds provided, mark all unpaid as paid
    if (!bookingIds || bookingIds.length === 0) {
      promoCode.referralBookings.forEach(booking => {
        if (!booking.commissionPaid) {
          booking.commissionPaid = true;
          booking.paidAt = now;
          markedCount++;
        }
      });
    }

    await promoCode.save();

    successResponse(res, {
      markedCount,
      message: `${markedCount} commission(s) marked as paid`
    }, 'Commissions marked as paid');

  } catch (error) {
    console.error('Mark commission paid error:', error);
    errorResponse(res, 'Failed to mark commissions as paid', 500);
  }
});

module.exports = router;
