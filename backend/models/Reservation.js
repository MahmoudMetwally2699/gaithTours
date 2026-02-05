const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow guest bookings without user account
  },
  touristName: {
    type: String,
    required: [true, 'Tourist name is required'],
    trim: true,
    minlength: [2, 'Tourist name must be at least 2 characters long']
  },  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(phone) {
        // Allow phone numbers with or without country codes, including those starting with 0
        return /^\+?[0-9]\d{1,14}$/.test(phone.replace(/[\s-]/g, ''));
      },
      message: 'Please enter a valid phone number'
    }
  },
  nationality: {
    type: String,
    required: [true, 'Nationality is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  hotel: {
    name: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Hotel address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'Hotel city is required'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Hotel country is required'],
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: false
      },
      longitude: {
        type: Number,
        required: false
      }
    },
    rating: {
      type: Number,
      min: 0,
      max: 10,
      required: false
    },
    image: {
      type: String,
      required: false
    },    url: {
      type: String,
      required: false,
      trim: true,
      validate: {
        validator: function(v) {
          // Only validate if URL is provided
          if (!v) return true;

          // More permissive URL validation that accepts query parameters and fragments
          // This will accept booking.com and other complex URLs with many query parameters
          try {
            new URL(v);
            return true;
          } catch (err) {
            return false;
          }
        },
        message: 'Please enter a valid URL'
      }
    },
    price: {
      type: Number,
      required: false,
      min: [0, 'Price cannot be negative']
    },
    hotelId: {
      type: String,
      required: false // RapidAPI hotel ID
    },
    // RateHawk specific fields
    hid: {
      type: Number,
      required: false // RateHawk numeric hotel ID
    },
    rateHawkMatchHash: {
      type: String,
      required: false // Match hash from search results
    },
    rateHawkBookHash: {
      type: String,
      required: false // Book hash for booking creation
    },
    // Prebook payment details (from RateHawk API)
    prebookPaymentAmount: {
      type: String, // Stored as string to preserve precision
      required: false
    },
    prebookPaymentCurrency: {
      type: String,
      required: false
    },
    rateHawkOrderId: {
      type: String,
      required: false // RateHawk order confirmation ID
    },
    // Hotel contact info
    phone: {
      type: String,
      required: false,
      trim: true
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true
    }
  },  checkInDate: {
    type: Date,
    required: false
  },
  checkOutDate: {
    type: Date,
    required: false
  },
  expectedCheckInTime: {
    type: String,
    required: false,
    trim: true
  },  roomType: {
    type: String,
    required: false, // Changed to false for backward compatibility
    trim: true,
    default: 'Standard Room' // Updated default value
  },
  stayType: {
    type: String,
    required: false, // Changed to false for backward compatibility
    trim: true,
    default: 'Leisure' // Updated default value
  },
  paymentMethod: {
    type: String,
    required: false, // Changed to false for backward compatibility
    trim: true,
    maxlength: [100, 'Payment method cannot exceed 100 characters'],
    default: 'pending' // Default value
  },
  promoCode: {
    type: String,
    required: false,
    trim: true,
    uppercase: true
  },
  discountAmount: {
    type: Number,
    required: false,
    min: [0, 'Discount amount cannot be negative']
  },
  // Loyalty points to redeem after successful payment
  loyaltyPointsToRedeem: {
    type: Number,
    required: false,
    default: 0,
    min: [0, 'Points cannot be negative']
  },
  loyaltyDiscount: {
    type: Number,
    required: false,
    default: 0,
    min: [0, 'Loyalty discount cannot be negative']
  },
  numberOfGuests: {
    type: Number,
    default: 1,
    min: 1
  },  guests: {
    type: [{
      fullName: {
        type: String,
        required: [true, 'Guest full name is required'],
        trim: true,
        minlength: [2, 'Guest name must be at least 2 characters long']
      },
      phoneNumber: {
        type: String,
        required: [true, 'Guest phone number is required'],
        validate: {
          validator: function(phone) {
            // Allow phone numbers with or without country codes, including those starting with 0
            return /^\+?[0-9]\d{1,14}$/.test(phone.replace(/[\s-]/g, ''));
          },
          message: 'Please enter a valid guest phone number'
        }
      }
    }],
    default: [] // Allow empty array by default
  },// Attachments field for PDF and image uploads
  attachments: [{
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      enum: ['pdf', 'image'],
      required: true
    },
    publicId: {
      type: String,
      required: true // Cloudinary public_id for deletion
    },
    size: {
      type: Number,
      required: true // File size in bytes
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalPrice: {
    type: Number,
    required: false,
    min: [0, 'Total price cannot be negative']
  },
  currency: {
    type: String,
    required: false,
    default: 'EGP'
  },
  // Actual payment amount in payment currency (USD) for commission calculation
  actualPaymentAmount: {
    type: Number,
    required: false,
    min: [0, 'Actual payment amount cannot be negative']
  },
  actualPaymentCurrency: {
    type: String,
    required: false,
    default: 'USD'
  },
  numberOfNights: {
    type: Number,
    required: false,
    min: [0, 'Number of nights cannot be negative']
  },
  numberOfRooms: {
    type: Number,
    required: false,
    default: 1,
    min: [1, 'Must have at least 1 room']
  },
  numberOfAdults: {
    type: Number,
    required: false,
    min: [1, 'Must have at least 1 adult']
  },
  numberOfChildren: {
    type: Number,
    required: false,
    default: 0,
    min: [0, 'Number of children cannot be negative']
  },
  meal: {
    type: String,
    required: false
  },
  // Cancellation policy from rate
  isRefundable: {
    type: Boolean,
    default: true // Default to refundable unless specified otherwise
  },
  freeCancellationBefore: {
    type: Date,
    required: false // Date before which cancellation is free
  },
  cancellationPenalty: {
    type: mongoose.Schema.Types.Mixed, // Can store penalty details
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'pending_payment', 'payment_confirmed', 'payment_failed', 'approved', 'denied', 'invoiced', 'paid', 'confirmed', 'cancelled', 'completed', 'failed'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  // RateHawk booking tracking
  ratehawkOrderId: {
    type: String,
    required: false // RateHawk Partner Order ID (GH-...)
  },
  ratehawkSystemOrderId: {
    type: String, // Numeric ID from RateHawk (e.g. 299890524)
    required: false
  },
  ratehawkStatus: {
    type: String,
    required: false // RateHawk booking status (ok, error, sandbox, etc.)
  },
  // Multi-room booking session tracking
  bookingSessionId: {
    type: String,
    required: false, // UUID linking multiple bookings together
    index: true // For efficient querying of related bookings
  },
  isPartOfMultiBooking: {
    type: Boolean,
    default: false // Indicates this booking is part of a multi-room-type order
  },
  roomCount: {
    type: Number,
    default: 1, // Number of rooms booked in this specific reservation
    min: 1
  },
  // Kashier payment tracking
  kashierOrderId: {
    type: String,
    required: false, // Kashier order reference ID
    index: true
  },
  kashierSessionId: {
    type: String,
    required: false // Kashier payment session ID
  },
  paymentConfirmedAt: {
    type: Date,
    required: false // Timestamp when payment was confirmed
  },
  // Refund tracking
  refundStatus: {
    type: String,
    enum: ['SUCCESS', 'PENDING', 'FAILURE', 'ERROR'],
    required: false
  },
  refundAmount: {
    type: Number,
    required: false
  },
  refundedAt: {
    type: Date,
    required: false
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

// Update the updatedAt field before saving
reservationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
reservationSchema.index({ user: 1, createdAt: -1 });
reservationSchema.index({ status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
