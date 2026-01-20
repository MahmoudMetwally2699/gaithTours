const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const User = require('../models/User');
const PromoCode = require('../models/PromoCode');
const { protect, admin } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * @route   GET /api/admin/analytics/revenue
 * @desc    Get revenue analytics over time
 * @access  Admin
 */
router.get('/revenue', protect, admin, async (req, res) => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query;

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Aggregation pipeline
    const dateFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const revenueData = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get comparison with previous period
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - (endDate.getDate() - startDate.getDate()));

    const previousRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: previousStartDate, $lte: previousEndDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const currentTotal = revenueData.reduce((sum, d) => sum + d.revenue, 0);
    const previousTotal = previousRevenue[0]?.total || 0;
    const growthRate = previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1)
      : 0;

    successResponse(res, {
      period,
      groupBy,
      data: revenueData.map(d => ({
        date: d._id,
        revenue: d.revenue,
        transactions: d.count
      })),
      summary: {
        totalRevenue: currentTotal,
        totalTransactions: revenueData.reduce((sum, d) => sum + d.count, 0),
        averageTransaction: revenueData.length > 0
          ? (currentTotal / revenueData.reduce((sum, d) => sum + d.count, 0)).toFixed(2)
          : 0,
        growthRate: parseFloat(growthRate),
        previousPeriodTotal: previousTotal
      }
    }, 'Revenue analytics retrieved');

  } catch (error) {
    console.error('Revenue analytics error:', error);
    errorResponse(res, 'Failed to get revenue analytics', 500);
  }
});

/**
 * @route   GET /api/admin/analytics/bookings
 * @desc    Get booking analytics and funnel data
 * @access  Admin
 */
router.get('/bookings', protect, admin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Bookings by status
    const bookingsByStatus = await Reservation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Bookings over time
    const bookingsOverTime = await Reservation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          confirmed: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Conversion funnel (simplified)
    const totalBookings = await Reservation.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    const confirmedBookings = await Reservation.countDocuments({
      status: 'confirmed',
      createdAt: { $gte: startDate, $lte: endDate }
    });
    const paidBookings = await Reservation.countDocuments({
      status: { $in: ['confirmed', 'completed'] },
      paymentConfirmedAt: { $exists: true },
      createdAt: { $gte: startDate, $lte: endDate }
    });

    successResponse(res, {
      period,
      byStatus: bookingsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      overTime: bookingsOverTime.map(d => ({
        date: d._id,
        total: d.total,
        confirmed: d.confirmed,
        cancelled: d.cancelled
      })),
      funnel: {
        initiated: totalBookings,
        confirmed: confirmedBookings,
        paid: paidBookings,
        conversionRate: totalBookings > 0
          ? ((paidBookings / totalBookings) * 100).toFixed(1)
          : 0
      }
    }, 'Booking analytics retrieved');

  } catch (error) {
    console.error('Booking analytics error:', error);
    errorResponse(res, 'Failed to get booking analytics', 500);
  }
});

/**
 * @route   GET /api/admin/analytics/popular-hotels
 * @desc    Get most popular hotels by bookings
 * @access  Admin
 */
router.get('/popular-hotels', protect, admin, async (req, res) => {
  try {
    const { limit = 10, period = '30d' } = req.query;

    const endDate = new Date();
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - (period === '7d' ? 7 : period === '90d' ? 90 : 30));

    const popularHotels = await Reservation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          'hotel.name': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$hotel.name',
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalPrice' },
          city: { $first: '$hotel.city' },
          country: { $first: '$hotel.country' }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: parseInt(limit) }
    ]);

    successResponse(res, {
      period,
      hotels: popularHotels.map((h, index) => ({
        rank: index + 1,
        name: h._id,
        city: h.city,
        country: h.country,
        bookings: h.bookings,
        revenue: h.revenue
      }))
    }, 'Popular hotels retrieved');

  } catch (error) {
    console.error('Popular hotels error:', error);
    errorResponse(res, 'Failed to get popular hotels', 500);
  }
});

/**
 * @route   GET /api/admin/analytics/popular-destinations
 * @desc    Get most popular destinations by bookings
 * @access  Admin
 */
router.get('/popular-destinations', protect, admin, async (req, res) => {
  try {
    const { limit = 10, period = '30d' } = req.query;

    const endDate = new Date();
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - (period === '7d' ? 7 : period === '90d' ? 90 : 30));

    const popularDestinations = await Reservation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          'hotel.city': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: { city: '$hotel.city', country: '$hotel.country' },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalPrice' },
          hotels: { $addToSet: '$hotel.name' }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: parseInt(limit) }
    ]);

    successResponse(res, {
      period,
      destinations: popularDestinations.map((d, index) => ({
        rank: index + 1,
        city: d._id.city,
        country: d._id.country,
        bookings: d.bookings,
        revenue: d.revenue,
        uniqueHotels: d.hotels.length
      }))
    }, 'Popular destinations retrieved');

  } catch (error) {
    console.error('Popular destinations error:', error);
    errorResponse(res, 'Failed to get popular destinations', 500);
  }
});

/**
 * @route   GET /api/admin/analytics/promo-stats
 * @desc    Get promo code usage analytics
 * @access  Admin
 */
router.get('/promo-stats', protect, admin, async (req, res) => {
  try {
    const { limit = 10, period = '30d' } = req.query;

    const endDate = new Date();
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - (period === '7d' ? 7 : period === '90d' ? 90 : 30));

    // 1. Top Performing Promo Codes
    const topPromoCodes = await PromoCode.find({
      // We could filter by usageCount > 0, but seeing 0 usage is also useful
    })
    .sort({ usageCount: -1 })
    .limit(parseInt(limit))
    .select('code usageCount discountType discountValue currency usageLimit')
    .lean();

    // Calculate total discount given per code (approximate if we don't aggregate usedBy)
    // Better to aggregate from usedBy array for accuracy within the period
    const promoStats = await Promise.all(topPromoCodes.map(async (code) => {
      // Find exact usage within period from the full doc (fetching just usedBy is heavy if huge, but okay for now)
      const fullCode = await PromoCode.findById(code._id).select('usedBy');

      const periodUsage = fullCode.usedBy.filter(usage =>
        usage.usedAt >= startDate && usage.usedAt <= endDate
      );

      const periodDiscount = periodUsage.reduce((sum, usage) => sum + (usage.discountApplied || 0), 0);
      const periodCount = periodUsage.length;

      return {
        ...code,
        periodCount,
        periodDiscount,
        totalDiscountGiven: fullCode.usedBy.reduce((sum, u) => sum + (u.discountApplied || 0), 0)
      };
    }));

    // Sort by period count
    promoStats.sort((a, b) => b.periodCount - a.periodCount);

    // 2. Recent Usage Activity
    // We need to aggregate across ALL promo codes to get a flat list of recent usage
    const recentActivity = await PromoCode.aggregate([
      { $unwind: '$usedBy' },
      { $match: { 'usedBy.usedAt': { $gte: startDate, $lte: endDate } } },
      { $sort: { 'usedBy.usedAt': -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: 'usedBy.user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $project: {
          code: 1,
          usedAt: '$usedBy.usedAt',
          discountApplied: '$usedBy.discountApplied',
          userName: { $arrayElemAt: ['$userInfo.name', 0] },
          userEmail: { $arrayElemAt: ['$userInfo.email', 0] }
        }
      }
    ]);

    successResponse(res, {
      period,
      topCodes: promoStats,
      recentActivity
    }, 'Promo stats retrieved');

  } catch (error) {
    console.error('Promo stats error:', error);
    errorResponse(res, 'Failed to get promo stats', 500);
  }
});

/**
 * @route   GET /api/admin/analytics/summary
 * @desc    Get quick summary stats for dashboard
 * @access  Admin
 */
router.get('/summary', protect, admin, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(today);
    startOfMonth.setDate(1);

    // Today's stats
    const [
      todayBookings,
      todayRevenue,
      weekBookings,
      weekRevenue,
      monthBookings,
      monthRevenue,
      totalUsers
    ] = await Promise.all([
      Reservation.countDocuments({ createdAt: { $gte: startOfDay } }),
      Payment.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Reservation.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Payment.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Reservation.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Payment.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      User.countDocuments({ role: 'user' })
    ]);

    successResponse(res, {
      today: {
        bookings: todayBookings,
        revenue: todayRevenue[0]?.total || 0
      },
      week: {
        bookings: weekBookings,
        revenue: weekRevenue[0]?.total || 0
      },
      month: {
        bookings: monthBookings,
        revenue: monthRevenue[0]?.total || 0
      },
      totalUsers
    }, 'Summary retrieved');

  } catch (error) {
    console.error('Summary error:', error);
    errorResponse(res, 'Failed to get summary', 500);
  }
});

/**
 * @route   GET /api/admin/analytics/export
 * @desc    Export analytics data as CSV
 * @access  Admin
 */
router.get('/export', protect, admin, async (req, res) => {
  try {
    const { type = 'bookings', period = '30d' } = req.query;

    const endDate = new Date();
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - (period === '7d' ? 7 : period === '90d' ? 90 : 30));

    let data;
    let filename;
    let headers;

    if (type === 'bookings') {
      data = await Reservation.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).select('touristName hotel.name hotel.city checkInDate checkOutDate totalPrice currency status createdAt').lean();

      filename = `bookings_${period}.csv`;
      headers = ['Guest Name', 'Hotel', 'City', 'Check In', 'Check Out', 'Total', 'Currency', 'Status', 'Created'];

      const rows = data.map(b => [
        b.touristName || 'N/A',
        b.hotel?.name || 'N/A',
        b.hotel?.city || 'N/A',
        b.checkInDate ? new Date(b.checkInDate).toISOString().split('T')[0] : 'N/A',
        b.checkOutDate ? new Date(b.checkOutDate).toISOString().split('T')[0] : 'N/A',
        b.totalPrice || 0,
        b.currency || 'USD',
        b.status || 'N/A',
        new Date(b.createdAt).toISOString().split('T')[0]
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      return res.send(csv);

    } else if (type === 'revenue') {
      data = await Payment.find({
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }).select('amount currency paymentMethod createdAt').populate('invoice', 'invoiceId').lean();

      filename = `revenue_${period}.csv`;
      headers = ['Invoice ID', 'Amount', 'Currency', 'Method', 'Date'];

      const rows = data.map(p => [
        p.invoice?.invoiceId || 'N/A',
        p.amount || 0,
        p.currency || 'USD',
        p.paymentMethod || 'N/A',
        new Date(p.createdAt).toISOString().split('T')[0]
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      return res.send(csv);
    }

    errorResponse(res, 'Invalid export type', 400);

  } catch (error) {
    console.error('Export error:', error);
    errorResponse(res, 'Failed to export data', 500);
  }
});

module.exports = router;
