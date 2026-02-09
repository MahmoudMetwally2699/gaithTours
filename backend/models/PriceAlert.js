const mongoose = require('mongoose');

const priceAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  hotelId: {
    type: String,
    required: true,
    index: true
  },
  hotelName: {
    type: String,
    required: true
  },
  hotelImage: {
    type: String
  },
  destination: {
    type: String,
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    required: true
  },
  adults: {
    type: Number,
    default: 2
  },
  children: {
    type: Number,
    default: 0
  },
  // Optional target price - only notify if price drops below this
  targetPrice: {
    type: Number,
    default: null
  },
  // Initial price when alert was created
  initialPrice: {
    type: Number,
    required: true
  },
  // Current observed price
  currentPrice: {
    type: Number,
    required: true
  },
  // Lowest price seen since watching
  lowestPrice: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  // Notification method
  notifyVia: {
    type: [String],
    enum: ['email', 'whatsapp'],
    default: ['email']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastChecked: {
    type: Date,
    default: null
  },
  lastNotified: {
    type: Date,
    default: null
  },
  // Price history for charts/trends
  priceHistory: [{
    price: Number,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient lookups
priceAlertSchema.index({ userId: 1, hotelId: 1, checkIn: 1, checkOut: 1 }, { unique: true });

// Index for background job queries
priceAlertSchema.index({ isActive: 1, lastChecked: 1 });

// Update timestamp on save
priceAlertSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PriceAlert', priceAlertSchema);
