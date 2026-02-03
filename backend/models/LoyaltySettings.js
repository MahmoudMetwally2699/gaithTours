const mongoose = require('mongoose');

// Singleton schema for admin-configurable loyalty settings
const loyaltySettingsSchema = new mongoose.Schema({
  // Points earning configuration: "For every $X spent, earn Y points"
  earningDollarsRequired: {
    type: Number,
    default: 1,  // $1
    min: 1
  },
  pointsPerDollar: {
    type: Number,
    default: 1,  // 1 point
    min: 0
  },
  // Points redemption configuration: "X points = $Y discount"
  pointsPerDollarRedemption: {
    type: Number,
    default: 100,
    min: 1
  },
  redemptionDollarValue: {
    type: Number,
    default: 1,  // $1
    min: 1
  },
  // Total points required to reach each tier
  tierThresholds: {
    Silver: { type: Number, default: 500 },
    Gold: { type: Number, default: 2000 },
    Platinum: { type: Number, default: 5000 }
  },
  // Benefits for each tier (no automatic discounts - users redeem points manually)
  tierBenefits: {
    Bronze: {
      discountPercent: { type: Number, default: 0 },
      freeCancellation: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      description: { type: String, default: 'Welcome to Gaith Tours rewards! Earn points on every booking.' }
    },
    Silver: {
      discountPercent: { type: Number, default: 0 },
      freeCancellation: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      description: { type: String, default: 'Silver member - Redeem your points for discounts!' }
    },
    Gold: {
      discountPercent: { type: Number, default: 0 },
      freeCancellation: { type: Boolean, default: true },
      prioritySupport: { type: Boolean, default: true },
      description: { type: String, default: 'Gold member - Free cancellation + priority support + redeem points!' }
    },
    Platinum: {
      discountPercent: { type: Number, default: 0 },
      freeCancellation: { type: Boolean, default: true },
      prioritySupport: { type: Boolean, default: true },
      description: { type: String, default: 'Platinum VIP - All premium benefits + redeem points for maximum savings!' }
    }
  },
  // Master toggle for loyalty program
  isEnabled: {
    type: Boolean,
    default: true
  },
  // Program name (for branding)
  programName: {
    type: String,
    default: 'Gaith Rewards'
  },
  // Points expiry in days (0 = never expire)
  pointsExpiryDays: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
loyaltySettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Calculate tier based on total points
loyaltySettingsSchema.statics.calculateTier = async function(totalPoints) {
  const settings = await this.getSettings();
  const { tierThresholds } = settings;

  if (totalPoints >= tierThresholds.Platinum) return 'Platinum';
  if (totalPoints >= tierThresholds.Gold) return 'Gold';
  if (totalPoints >= tierThresholds.Silver) return 'Silver';
  return 'Bronze';
};

// Get benefits for a specific tier
loyaltySettingsSchema.statics.getTierBenefits = async function(tier) {
  const settings = await this.getSettings();
  return settings.tierBenefits[tier] || settings.tierBenefits.Bronze;
};

module.exports = mongoose.model('LoyaltySettings', loyaltySettingsSchema);
