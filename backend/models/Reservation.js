const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  touristName: {
    type: String,
    required: [true, 'Tourist name is required'],
    trim: true,
    minlength: [2, 'Tourist name must be at least 2 characters long']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(phone) {
        return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/[\s-]/g, ''));
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
    },
    hotelId: {
      type: String,
      required: false // RapidAPI hotel ID
    }
  },
  checkInDate: {
    type: Date,
    required: false
  },
  checkOutDate: {
    type: Date,
    required: false
  },
  numberOfGuests: {
    type: Number,
    default: 1,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
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
