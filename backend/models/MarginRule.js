const mongoose = require('mongoose');

const marginRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Rule name is required'],
    trim: true,
    maxlength: [100, 'Rule name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'hybrid'],
    default: 'percentage'
  },
  value: {
    type: Number,
    required: [true, 'Margin value is required'],
    min: [0, 'Margin value cannot be negative'],
    max: [100, 'Percentage margin cannot exceed 100%']
  },
  fixedAmount: {
    type: Number,
    default: 0,
    min: [0, 'Fixed amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'SAR',
    enum: ['SAR', 'USD', 'EUR', 'GBP', 'AED']
  },
  priority: {
    type: Number,
    default: 0,
    min: [0, 'Priority cannot be negative'],
    max: [100, 'Priority cannot exceed 100']
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  // Conditions for rule matching
  conditions: {
    // Geographic filters
    countries: [{
      type: String,
      trim: true
    }],
    cities: [{
      type: String,
      trim: true
    }],
    // Hotel filters
    starRating: {
      min: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      },
      max: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      }
    },
    hotelBrands: [{
      type: String,
      trim: true
    }],
    // Date filters
    dateRange: {
      start: {
        type: Date,
        default: null
      },
      end: {
        type: Date,
        default: null
      }
    },
    // Booking value filters
    bookingValue: {
      min: {
        type: Number,
        default: null
      },
      max: {
        type: Number,
        default: null
      }
    },
    // Meal type filters
    mealTypes: [{
      type: String,
      enum: ['room_only', 'breakfast', 'half_board', 'full_board', 'all_inclusive']
    }],
    // Customer type
    customerType: {
      type: String,
      enum: ['all', 'b2c', 'b2b'],
      default: 'all'
    }
  },
  // Tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Stats
  appliedCount: {
    type: Number,
    default: 0
  },
  totalRevenueGenerated: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
marginRuleSchema.index({ status: 1, priority: -1 });
marginRuleSchema.index({ 'conditions.countries': 1 });
marginRuleSchema.index({ 'conditions.cities': 1 });
marginRuleSchema.index({ createdAt: -1 });

// Static method to find matching rules for a booking
marginRuleSchema.statics.findMatchingRules = async function(bookingContext) {
  const {
    country,
    city,
    starRating,
    bookingValue,
    checkInDate,
    mealType,
    customerType = 'b2c'
  } = bookingContext;

  // Get all active rules sorted by priority
  const allRules = await this.find({ status: 'active' }).sort({ priority: -1 });

  // Filter rules that match the booking context
  return allRules.filter(rule => {
    const c = rule.conditions;

    // Check geographic filters
    // If rule has countries specified, booking country must match
    if (c.countries && c.countries.length > 0) {
      if (!country || !c.countries.includes(country)) {
        return false;
      }
    }

    // If rule has cities specified, booking city must match
    if (c.cities && c.cities.length > 0) {
      if (!city || !c.cities.includes(city)) {
        return false;
      }
    }

    // Check star rating
    if (c.starRating) {
      if (c.starRating.min && starRating < c.starRating.min) return false;
      if (c.starRating.max && starRating > c.starRating.max) return false;
    }

    // Check booking value
    if (c.bookingValue) {
      if (c.bookingValue.min && bookingValue < c.bookingValue.min) return false;
      if (c.bookingValue.max && bookingValue > c.bookingValue.max) return false;
    }

    // Check date range
    if (c.dateRange) {
      if (checkInDate) {
        const checkInDateTime = new Date(checkInDate);
        if (c.dateRange.start && checkInDateTime < new Date(c.dateRange.start)) return false;
        if (c.dateRange.end && checkInDateTime > new Date(c.dateRange.end)) return false;
      }
    }

    // Check meal type
    if (c.mealTypes && c.mealTypes.length > 0) {
      if (!mealType || !c.mealTypes.includes(mealType)) return false;
    }

    // Check customer type
    if (c.customerType && c.customerType !== 'all') {
      if (c.customerType !== customerType) return false;
    }

    return true;
  });
};

// Instance method to calculate margin amount
marginRuleSchema.methods.calculateMargin = function(basePrice) {
  let marginAmount = 0;

  switch (this.type) {
    case 'percentage':
      marginAmount = basePrice * (this.value / 100);
      break;
    case 'fixed':
      marginAmount = this.fixedAmount;
      break;
    case 'hybrid':
      const percentageMargin = basePrice * (this.value / 100);
      marginAmount = Math.max(percentageMargin, this.fixedAmount);
      break;
  }

  return Math.round(marginAmount * 100) / 100; // Round to 2 decimal places
};

const MarginRule = mongoose.model('MarginRule', marginRuleSchema);

module.exports = MarginRule;
