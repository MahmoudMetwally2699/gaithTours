const express = require('express');
const router = express.Router();
const User = require('../models/User');
const LoyaltySettings = require('../models/LoyaltySettings');
const jwt = require('jsonwebtoken');
const { sendPushNotification } = require('../utils/pushService');

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// ==================== USER ENDPOINTS ====================

// Get user's loyalty status
router.get('/status', authenticate, async (req, res) => {
  try {
    const settings = await LoyaltySettings.getSettings();

    if (!settings.isEnabled) {
      return res.json({
        enabled: false,
        message: 'Loyalty program is currently disabled'
      });
    }

    const user = await User.findById(req.user._id)
      .select('loyaltyPoints loyaltyTier totalSpent');

    const tierBenefits = settings.tierBenefits[user.loyaltyTier] || settings.tierBenefits.Bronze;

    // Calculate progress to next tier
    let nextTier = null;
    let pointsToNextTier = 0;
    let progressPercent = 100;

    if (user.loyaltyTier === 'Bronze') {
      nextTier = 'Silver';
      pointsToNextTier = settings.tierThresholds.Silver - user.loyaltyPoints;
      progressPercent = (user.loyaltyPoints / settings.tierThresholds.Silver) * 100;
    } else if (user.loyaltyTier === 'Silver') {
      nextTier = 'Gold';
      pointsToNextTier = settings.tierThresholds.Gold - user.loyaltyPoints;
      progressPercent = ((user.loyaltyPoints - settings.tierThresholds.Silver) /
        (settings.tierThresholds.Gold - settings.tierThresholds.Silver)) * 100;
    } else if (user.loyaltyTier === 'Gold') {
      nextTier = 'Platinum';
      pointsToNextTier = settings.tierThresholds.Platinum - user.loyaltyPoints;
      progressPercent = ((user.loyaltyPoints - settings.tierThresholds.Gold) /
        (settings.tierThresholds.Platinum - settings.tierThresholds.Gold)) * 100;
    }

    res.json({
      enabled: true,
      programName: settings.programName,
      points: user.loyaltyPoints,
      tier: user.loyaltyTier,
      totalSpent: user.totalSpent,
      benefits: tierBenefits,
      nextTier: nextTier ? {
        name: nextTier,
        pointsNeeded: Math.max(0, pointsToNextTier),
        progress: Math.min(100, Math.max(0, progressPercent))
      } : null,
      tierThresholds: settings.tierThresholds
    });
  } catch (error) {
    console.error('Error fetching loyalty status:', error);
    res.status(500).json({ message: 'Error fetching loyalty status' });
  }
});

// Calculate points redemption value for checkout
router.get('/calculate-redemption', authenticate, async (req, res) => {
  try {
    const { bookingAmount } = req.query;
    const settings = await LoyaltySettings.getSettings();

    if (!settings.isEnabled) {
      return res.json({
        canRedeem: false,
        message: 'Loyalty program is currently disabled'
      });
    }

    const user = await User.findById(req.user._id).select('loyaltyPoints loyaltyTier');
    const tierBenefits = settings.tierBenefits[user.loyaltyTier] || settings.tierBenefits.Bronze;

    // Redemption configuration: X points = $Y discount
    const pointsRequired = settings.pointsPerDollarRedemption || 100;
    const dollarValue = settings.redemptionDollarValue || 1;

    // Calculate max discount based on user's points
    const maxRedeemablePoints = user.loyaltyPoints;
    const maxDiscount = Math.floor(maxRedeemablePoints / pointsRequired) * dollarValue;

    // Cap discount at booking amount if provided
    const bookingValue = parseFloat(bookingAmount) || 0;
    const applicableDiscount = bookingValue > 0 ? Math.min(maxDiscount, bookingValue) : maxDiscount;
    const pointsToUse = Math.floor(applicableDiscount / dollarValue) * pointsRequired;

    // Note: Tier discounts have been removed. Users now only get discounts by redeeming points.
    const tierDiscount = 0;
    const tierDiscountAmount = 0;

    res.json({
      canRedeem: user.loyaltyPoints >= pointsRequired,
      availablePoints: user.loyaltyPoints,
      pointsPerDollar: pointsRequired, // For frontend display
      dollarValue: dollarValue, // How much $1 discount is worth
      maxDiscount: maxDiscount,
      maxRedeemablePoints: maxRedeemablePoints,
      // For the specific booking amount
      applicableDiscount: applicableDiscount,
      pointsToUse: pointsToUse,
      // Tier info (no automatic discounts)
      tierDiscountPercent: tierDiscount,
      tierDiscountAmount: tierDiscountAmount,
      // Only points-based savings
      totalPotentialSavings: applicableDiscount,
      tier: user.loyaltyTier
    });
  } catch (error) {
    console.error('Error calculating redemption:', error);
    res.status(500).json({ message: 'Error calculating redemption value' });
  }
});

// Redeem points for a booking (called during checkout)
router.post('/redeem', authenticate, async (req, res) => {
  try {
    const { pointsToRedeem, bookingId } = req.body;
    const settings = await LoyaltySettings.getSettings();

    if (!settings.isEnabled) {
      return res.status(400).json({ message: 'Loyalty program is currently disabled' });
    }

    if (!pointsToRedeem || pointsToRedeem <= 0) {
      return res.status(400).json({ message: 'Invalid points amount' });
    }

    const user = await User.findById(req.user._id);

    if (user.loyaltyPoints < pointsToRedeem) {
      return res.status(400).json({
        message: 'Insufficient points',
        available: user.loyaltyPoints,
        requested: pointsToRedeem
      });
    }

    // Calculate discount value using configurable rate
    const pointsRequired = settings.pointsPerDollarRedemption || 100;
    const dollarValue = settings.redemptionDollarValue || 1;
    const discountValue = Math.floor(pointsToRedeem / pointsRequired) * dollarValue;
    const actualPointsUsed = Math.floor(discountValue / dollarValue) * pointsRequired;

    // Deduct points
    const previousPoints = user.loyaltyPoints;
    user.loyaltyPoints -= actualPointsUsed;

    // Recalculate tier (might go down if points drop)
    user.loyaltyTier = await LoyaltySettings.calculateTier(user.loyaltyPoints);

    await user.save();

    console.log(`🎁 Loyalty Redemption: ${user.email} redeemed ${actualPointsUsed} points for $${discountValue} discount. Points: ${previousPoints} → ${user.loyaltyPoints}`);

    res.json({
      success: true,
      discountApplied: discountValue,
      pointsRedeemed: actualPointsUsed,
      remainingPoints: user.loyaltyPoints,
      newTier: user.loyaltyTier,
      message: `Applied $${discountValue} discount using ${actualPointsUsed} points!`
    });
  } catch (error) {
    console.error('Error redeeming points:', error);
    res.status(500).json({ message: 'Error redeeming points' });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// Get loyalty settings (admin)
router.get('/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await LoyaltySettings.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching loyalty settings:', error);
    res.status(500).json({ message: 'Error fetching loyalty settings' });
  }
});

// Update loyalty settings (admin)
router.put('/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      pointsPerDollar,
      pointsPerDollarRedemption,
      tierThresholds,
      tierBenefits,
      isEnabled,
      programName,
      pointsExpiryDays
    } = req.body;

    let settings = await LoyaltySettings.getSettings();

    if (pointsPerDollar !== undefined) settings.pointsPerDollar = pointsPerDollar;
    if (req.body.earningDollarsRequired !== undefined) settings.earningDollarsRequired = req.body.earningDollarsRequired;
    if (pointsPerDollarRedemption !== undefined) settings.pointsPerDollarRedemption = pointsPerDollarRedemption;
    if (req.body.redemptionDollarValue !== undefined) settings.redemptionDollarValue = req.body.redemptionDollarValue;
    if (tierThresholds) settings.tierThresholds = { ...settings.tierThresholds, ...tierThresholds };
    if (tierBenefits) {
      // Deep merge tier benefits
      Object.keys(tierBenefits).forEach(tier => {
        if (settings.tierBenefits[tier]) {
          settings.tierBenefits[tier] = { ...settings.tierBenefits[tier], ...tierBenefits[tier] };
        }
      });
    }
    if (isEnabled !== undefined) settings.isEnabled = isEnabled;
    if (programName !== undefined) settings.programName = programName;
    if (pointsExpiryDays !== undefined) settings.pointsExpiryDays = pointsExpiryDays;

    await settings.save();

    res.json({ message: 'Settings updated', settings });
  } catch (error) {
    console.error('Error updating loyalty settings:', error);
    res.status(500).json({ message: 'Error updating loyalty settings' });
  }
});

// Get all users with loyalty info (admin)
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, tier, search } = req.query;

    const query = { role: 'user' };

    if (tier) {
      query.loyaltyTier = tier;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('name email loyaltyPoints loyaltyTier totalSpent createdAt')
      .sort({ loyaltyPoints: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching loyalty users:', error);
    res.status(500).json({ message: 'Error fetching loyalty users' });
  }
});

// Manually adjust user points (admin)
router.post('/adjust/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { points, reason } = req.body;

    if (typeof points !== 'number') {
      return res.status(400).json({ message: 'Points must be a number' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldTier = user.loyaltyTier;
    const oldPoints = user.loyaltyPoints;
    user.loyaltyPoints = Math.max(0, user.loyaltyPoints + points);

    // Recalculate tier
    const newTier = await LoyaltySettings.calculateTier(user.loyaltyPoints);
    user.loyaltyTier = newTier;

    await user.save();

    // Send push notification if tier upgraded
    const tierOrder = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    if (tierOrder.indexOf(newTier) > tierOrder.indexOf(oldTier)) {
      try {
        await sendPushNotification(user._id, {
          title: `🏆 Tier Upgrade: ${newTier}!`,
          body: `Congratulations! You've been upgraded to ${newTier} tier. Enjoy your new benefits!`,
          url: '/profile',
          tag: `tier-upgrade-${newTier}`
        });
      } catch (pushError) {
        console.error('Failed to send tier upgrade push:', pushError.message);
      }
    }

    console.log(`Admin ${req.user.email} adjusted ${user.email}'s points: ${oldPoints} -> ${user.loyaltyPoints} (${points > 0 ? '+' : ''}${points}). Reason: ${reason || 'No reason provided'}`);

    res.json({
      message: 'Points adjusted successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        loyaltyPoints: user.loyaltyPoints,
        loyaltyTier: user.loyaltyTier
      },
      adjustment: {
        oldPoints,
        newPoints: user.loyaltyPoints,
        change: points,
        reason
      }
    });
  } catch (error) {
    console.error('Error adjusting points:', error);
    res.status(500).json({ message: 'Error adjusting points' });
  }
});

// Get loyalty statistics (admin)
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const stats = await User.aggregate([
      { $match: { role: 'user' } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalPoints: { $sum: '$loyaltyPoints' },
          totalSpent: { $sum: '$totalSpent' },
          avgPoints: { $avg: '$loyaltyPoints' }
        }
      }
    ]);

    const tierCounts = await User.aggregate([
      { $match: { role: 'user' } },
      {
        $group: {
          _id: '$loyaltyTier',
          count: { $sum: 1 }
        }
      }
    ]);

    const tierDistribution = {
      Bronze: 0,
      Silver: 0,
      Gold: 0,
      Platinum: 0
    };

    tierCounts.forEach(({ _id, count }) => {
      if (_id && tierDistribution.hasOwnProperty(_id)) {
        tierDistribution[_id] = count;
      }
    });

    res.json({
      totalUsers: stats[0]?.totalUsers || 0,
      totalPoints: stats[0]?.totalPoints || 0,
      totalSpent: stats[0]?.totalSpent || 0,
      avgPoints: Math.round(stats[0]?.avgPoints || 0),
      tierDistribution
    });
  } catch (error) {
    console.error('Error fetching loyalty stats:', error);
    res.status(500).json({ message: 'Error fetching loyalty stats' });
  }
});

module.exports = router;
