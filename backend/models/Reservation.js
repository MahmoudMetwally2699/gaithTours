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
    rateHawkOrderId: {
      type: String,
      required: false // RateHawk order confirmation ID
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'invoiced', 'paid', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  // RateHawk booking tracking
  ratehawkOrderId: {
    type: String,
    required: false // RateHawk order ID from booking confirmation
  },
  ratehawkStatus: {
    type: String,
    required: false // RateHawk booking status (ok, error, sandbox, etc.)
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
