const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Promo code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [3, 'Code must be at least 3 characters'],
    maxlength: [20, 'Code cannot exceed 20 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Discount type is required']
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  minBookingValue: {
    type: Number,
    default: 0,
    min: [0, 'Minimum booking value cannot be negative']
  },
  maxDiscount: {
    type: Number,
    default: null // null means no cap
  },
  currency: {
    type: String,
    default: 'USD'
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required']
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
  },
  usageLimit: {
    type: Number,
    default: null // null means unlimited
  },
  usageCount: {
    type: Number,
    default: 0
  },
  perUserLimit: {
    type: Number,
    default: 1 // How many times a single user can use this code
  },
  // Targeting options
  applicableHotels: [{
    type: String // Hotel IDs or names
  }],
  applicableDestinations: [{
    type: String // Destination names or region IDs
  }],
  applicableMinStars: {
    type: Number,
    min: 1,
    max: 5,
    default: null // null means any star rating
  },
  // User tracking
  usedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation'
    },
    discountApplied: Number
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  // Promo code type: standard (regular promo) or referral (partner QR code)
  type: {
    type: String,
    enum: ['standard', 'referral'],
    default: 'standard'
  },
  // Partner information for referral type codes
  partnerInfo: {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    commissionType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    commissionValue: {
      type: Number,
      default: 5 // 5% default commission
    }
  },
  // Total commission earned by this referral partner
  totalCommissionEarned: {
    type: Number,
    default: 0
  },
  // Referral bookings tracking
  referralBookings: [{
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation'
    },
    bookingValue: Number,
    customerDiscount: Number,
    partnerCommission: Number,
    commissionPaid: {
      type: Boolean,
      default: false
    },
    paidAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
promoCodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  // Ensure code is uppercase
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});

// Validation: validUntil must be after validFrom
promoCodeSchema.pre('validate', function(next) {
  if (this.validFrom && this.validUntil && this.validFrom >= this.validUntil) {
    this.invalidate('validUntil', 'Valid until date must be after valid from date');
  }
  // Max discount only makes sense for percentage discounts
  if (this.discountType === 'fixed' && this.maxDiscount) {
    this.maxDiscount = null;
  }
  // Percentage must be <= 100
  if (this.discountType === 'percentage' && this.discountValue > 100) {
    this.invalidate('discountValue', 'Percentage discount cannot exceed 100%');
  }
  next();
});

// Instance method: Check if code is currently valid
promoCodeSchema.methods.isValid = function() {
  const now = new Date();
  return this.isActive &&
         this.validFrom <= now &&
         this.validUntil >= now &&
         (this.usageLimit === null || this.usageCount < this.usageLimit);
};

// Instance method: Calculate discount for a given booking value
promoCodeSchema.methods.calculateDiscount = function(bookingValue) {
  if (bookingValue < this.minBookingValue) {
    return { valid: false, message: `Minimum booking value is ${this.currency} ${this.minBookingValue}` };
  }

  let discount;
  if (this.discountType === 'percentage') {
    discount = (bookingValue * this.discountValue) / 100;
    // Apply max discount cap if set
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else {
    discount = this.discountValue;
    // Fixed discount cannot exceed booking value
    if (discount > bookingValue) {
      discount = bookingValue;
    }
  }

  return {
    valid: true,
    originalValue: bookingValue,
    discount: Math.round(discount * 100) / 100, // Round to 2 decimals
    finalValue: Math.round((bookingValue - discount) * 100) / 100,
    currency: this.currency
  };
};

// Instance method: Check if user can use this code
promoCodeSchema.methods.canUserUse = function(userId) {
  if (!userId) return { canUse: true }; // Guest users can use promo codes

  const userUsage = this.usedBy.filter(u => u.user && u.user.toString() === userId.toString());
  if (userUsage.length >= this.perUserLimit) {
    return {
      canUse: false,
      message: `You have already used this code ${this.perUserLimit} time(s)`
    };
  }
  return { canUse: true };
};

// Static method: Find valid code by code string
promoCodeSchema.statics.findValidCode = async function(code) {
  const promoCode = await this.findOne({
    code: code.toUpperCase(),
    isActive: true
  });

  if (!promoCode) {
    return { valid: false, message: 'Promo code not found' };
  }

  if (!promoCode.isValid()) {
    return { valid: false, message: 'Promo code has expired or reached its usage limit' };
  }

  return { valid: true, promoCode };
};

// Instance method: Calculate partner commission for referral codes
promoCodeSchema.methods.calculateCommission = function(bookingValue) {
  if (this.type !== 'referral' || !this.partnerInfo) {
    return { commission: 0 };
  }

  let commission;
  if (this.partnerInfo.commissionType === 'percentage') {
    commission = (bookingValue * this.partnerInfo.commissionValue) / 100;
  } else {
    commission = this.partnerInfo.commissionValue;
  }

  return {
    commission: Math.round(commission * 100) / 100,
    commissionType: this.partnerInfo.commissionType,
    commissionValue: this.partnerInfo.commissionValue
  };
};

// Instance method: Record a referral booking
promoCodeSchema.methods.recordReferralBooking = async function(bookingId, bookingValue, customerDiscount) {
  if (this.type !== 'referral') return;

  const { commission } = this.calculateCommission(bookingValue);

  this.referralBookings.push({
    bookingId,
    bookingValue,
    customerDiscount,
    partnerCommission: commission,
    commissionPaid: false
  });

  this.totalCommissionEarned += commission;
  await this.save();
};

// Indexes
promoCodeSchema.index({ code: 1 });
promoCodeSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
promoCodeSchema.index({ createdBy: 1 });
promoCodeSchema.index({ type: 1 }); // Index for filtering by type

module.exports = mongoose.model('PromoCode', promoCodeSchema);
