const express = require('express');
const router = express.Router();
const PromoCode = require('../models/PromoCode');
const { protect } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * Partner middleware - ensures user is a partner
 */
const partnerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'partner') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Partner role required.' });
  }
};

/**
 * @route   GET /api/partners/me
 * @desc    Get partner's assigned promo code and info
 * @access  Partner only
 */
router.get('/me', protect, partnerOnly, async (req, res) => {
  try {
    // Find the referral promo code created for this partner
    const promoCode = await PromoCode.findOne({
      createdBy: req.user._id,
      type: 'referral'
    });

    if (!promoCode) {
      return errorResponse(res, 'No referral code found for this partner', 404);
    }

    // Generate referral URL
    const baseUrl = process.env.FRONTEND_URL || 'https://gaithtours.com';
    const referralUrl = `${baseUrl}?ref=${promoCode.code}`;

    successResponse(res, {
      partner: {
        name: req.user.name,
        email: req.user.email,
        createdAt: req.user.createdAt
      },
      promoCode: {
        code: promoCode.code,
        description: promoCode.description,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        referralUrl,
        isActive: promoCode.isActive
      }
    }, 'Partner info retrieved successfully');

  } catch (error) {
    console.error('Get partner info error:', error);
    errorResponse(res, 'Failed to get partner info', 500);
  }
});

/**
 * @route   GET /api/partners/stats
 * @desc    Get partner's commission and usage statistics
 * @access  Partner only
 */
router.get('/stats', protect, partnerOnly, async (req, res) => {
  try {
    // Find the referral promo code created for this partner
    const promoCode = await PromoCode.findOne({
      createdBy: req.user._id,
      type: 'referral'
    }).populate('referralBookings.bookingId', 'touristName hotel.name totalPrice createdAt status');

    if (!promoCode) {
      return errorResponse(res, 'No referral code found for this partner', 404);
    }

    // Calculate stats
    const totalBookings = promoCode.referralBookings?.length || 0;
    const totalCommissionEarned = promoCode.totalCommissionEarned || 0;

    const paidCommissions = promoCode.referralBookings
      ?.filter(b => b.commissionPaid)
      .reduce((sum, b) => sum + (b.partnerCommission || 0), 0) || 0;

    const pendingCommissions = totalCommissionEarned - paidCommissions;

    // Get total booking value
    const totalBookingValue = promoCode.referralBookings
      ?.reduce((sum, b) => sum + (b.bookingValue || 0), 0) || 0;

    // Recent bookings (last 10)
    const recentBookings = promoCode.referralBookings
      ?.slice(-10)
      .reverse()
      .map(b => ({
        id: b._id,
        bookingValue: b.bookingValue,
        customerDiscount: b.customerDiscount,
        commission: b.partnerCommission,
        isPaid: b.commissionPaid,
        paidAt: b.paidAt,
        createdAt: b.createdAt,
        booking: b.bookingId
      })) || [];

    successResponse(res, {
      stats: {
        totalBookings,
        totalBookingValue,
        totalCommissionEarned,
        paidCommissions,
        pendingCommissions,
        currency: promoCode.currency || 'USD'
      },
      recentBookings,
      commissionInfo: {
        type: promoCode.partnerInfo?.commissionType || 'percentage',
        value: promoCode.partnerInfo?.commissionValue || 0
      }
    }, 'Partner stats retrieved successfully');

  } catch (error) {
    console.error('Get partner stats error:', error);
    errorResponse(res, 'Failed to get partner stats', 500);
  }
});

/**
 * @route   GET /api/partners/bookings
 * @desc    Get paginated list of partner's referral bookings
 * @access  Partner only
 */
router.get('/bookings', protect, partnerOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const promoCode = await PromoCode.findOne({
      createdBy: req.user._id,
      type: 'referral'
    }).populate('referralBookings.bookingId', 'touristName hotel.name totalPrice createdAt status');

    if (!promoCode) {
      return errorResponse(res, 'No referral code found for this partner', 404);
    }

    const allBookings = promoCode.referralBookings || [];
    const total = allBookings.length;

    // Paginate (newest first)
    const start = (page - 1) * limit;
    const paginatedBookings = allBookings
      .slice()
      .reverse()
      .slice(start, start + limit)
      .map(b => ({
        id: b._id,
        bookingValue: b.bookingValue,
        customerDiscount: b.customerDiscount,
        commission: b.partnerCommission,
        isPaid: b.commissionPaid,
        paidAt: b.paidAt,
        createdAt: b.createdAt,
        booking: b.bookingId
      }));

    successResponse(res, {
      bookings: paginatedBookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 'Bookings retrieved successfully');

  } catch (error) {
    console.error('Get partner bookings error:', error);
    errorResponse(res, 'Failed to get bookings', 500);
  }
});

module.exports = router;
