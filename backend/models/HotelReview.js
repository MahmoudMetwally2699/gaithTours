const mongoose = require('mongoose');

/**
 * Hotel Review Schema
 * Stores reviews fetched from RateHawk API
 * Updated weekly from dumps or incrementally via Content API
 */
const HotelReviewSchema = new mongoose.Schema({
  // Hotel identifiers
  hotel_id: {
    type: String,
    required: true,
    index: true,
    comment: 'Hotel ID from RateHawk (string format)'
  },

  hid: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    comment: 'Hotel ID from RateHawk (numeric format)'
  },

  // Language of reviews
  language: {
    type: String,
    required: true,
    default: 'en',
    index: true,
    comment: 'ISO 639-1 language code (en, ar, etc.)'
  },

  // Overall hotel rating from RateHawk
  overall_rating: {
    type: Number,
    min: 0,
    max: 10,
    comment: 'Overall hotel rating from RateHawk (0-10 scale)'
  },

  // Detailed ratings breakdown
  detailed_ratings: {
    cleanness: { type: Number, min: 0, max: 10 },
    location: { type: Number, min: 0, max: 10 },
    price: { type: Number, min: 0, max: 10 },
    services: { type: Number, min: 0, max: 10 },
    room: { type: Number, min: 0, max: 10 },
    meal: { type: Number, min: 0, max: 10 },
    wifi: { type: Number, min: 0, max: 10 },
    hygiene: { type: Number, min: 0, max: 10 }
  },

  // Aggregated review data (calculated from reviews array)
  average_rating: {
    type: Number,
    min: 0,
    max: 10,
    comment: 'Average rating calculated from all reviews (0-10 scale)'
  },

  review_count: {
    type: Number,
    default: 0,
    comment: 'Total number of reviews'
  },

  // Individual reviews
  reviews: [{
    id: {
      type: Number,
      required: true,
      comment: 'Unique review ID'
    },

    review_plus: {
      type: String,
      comment: 'Positive aspects of the review'
    },

    review_minus: {
      type: String,
      comment: 'Negative aspects of the review'
    },

    created: {
      type: Date,
      comment: 'Review creation date'
    },

    author: {
      type: String,
      comment: 'Review author name'
    },

    adults: {
      type: Number,
      default: 0,
      comment: 'Number of adults in the stay'
    },

    children: {
      type: Number,
      default: 0,
      comment: 'Number of children in the stay'
    },

    room_name: {
      type: String,
      comment: 'Name of the room booked'
    },

    nights: {
      type: Number,
      default: 1,
      comment: 'Number of nights stayed'
    },

    images: [{
      type: String,
      comment: 'URLs of review images'
    }],

    detailed_review: {
      cleanness: {
        type: Number,
        min: 0,
        max: 10,
        comment: 'Cleanliness rating (0-10)'
      },
      location: {
        type: Number,
        min: 0,
        max: 10,
        comment: 'Location rating (0-10)'
      },
      price: {
        type: Number,
        min: 0,
        max: 10,
        comment: 'Value for money rating (0-10)'
      },
      services: {
        type: Number,
        min: 0,
        max: 10,
        comment: 'Services rating (0-10)'
      },
      room: {
        type: Number,
        min: 0,
        max: 10,
        comment: 'Room rating (0-10)'
      },
      meal: {
        type: Number,
        min: 0,
        max: 10,
        comment: 'Meal rating (0-10)'
      },
      wifi: {
        type: String,
        enum: ['unspecified', 'perfect', 'good', 'slow', 'downtime', 'unused'],
        default: 'unspecified',
        comment: 'WiFi quality'
      },
      hygiene: {
        type: String,
        enum: ['unspecified', 'good', 'ok', 'bad', 'unused'],
        default: 'unspecified',
        comment: 'Hygiene level'
      }
    },

    traveller_type: {
      type: String,
      enum: ['unspecified', 'family', 'couple', 'solo_travel', 'business', 'group'],
      default: 'unspecified',
      comment: 'Type of traveller'
    },

    trip_type: {
      type: String,
      enum: ['unspecified', 'leisure', 'business'],
      default: 'unspecified',
      comment: 'Purpose of trip'
    },

    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
      comment: 'Overall rating for this review (0-10)'
    }
  }],

  // Metadata
  last_updated: {
    type: Date,
    default: Date.now,
    comment: 'Last time this document was updated'
  },

  source: {
    type: String,
    enum: ['dump', 'incremental', 'api', 'manual'],
    default: 'dump',
    comment: 'Source of the review data'
  },

  dump_date: {
    type: Date,
    comment: 'Date of the dump this data came from'
  }
}, {
  timestamps: true,
  collection: 'hotel_reviews'
});

// Indexes for efficient querying
HotelReviewSchema.index({ hid: 1, language: 1 });
HotelReviewSchema.index({ hotel_id: 1, language: 1 });
HotelReviewSchema.index({ average_rating: -1 });
HotelReviewSchema.index({ review_count: -1 });
HotelReviewSchema.index({ 'reviews.created': -1 });
HotelReviewSchema.index({ last_updated: 1 });

// Pre-save hook to calculate average rating
HotelReviewSchema.pre('save', function(next) {
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.average_rating = totalRating / this.reviews.length;
    this.review_count = this.reviews.length;
  }
  next();
});

// Static method to find reviews by hotel ID (supports both formats)
HotelReviewSchema.statics.findByHotelId = async function(hotelId, language = 'en') {
  // Try to find by hid (numeric) first, then by hotel_id (string)
  const isNumeric = !isNaN(hotelId);

  if (isNumeric) {
    return this.findOne({ hid: parseInt(hotelId), language });
  } else {
    return this.findOne({ hotel_id: hotelId, language });
  }
};

// Static method to get reviews summary for multiple hotels
HotelReviewSchema.statics.getSummaries = async function(hotelIds, language = 'en') {
  const isNumeric = hotelIds.length > 0 && !isNaN(hotelIds[0]);

  const query = isNumeric
    ? { hid: { $in: hotelIds.map(id => parseInt(id)) }, language }
    : { hotel_id: { $in: hotelIds }, language };

  return this.find(query).select('hotel_id hid average_rating overall_rating review_count language');
};

// Instance method to get top reviews (sorted by rating)
HotelReviewSchema.methods.getTopReviews = function(limit = 10) {
  return this.reviews
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
};

// Instance method to get recent reviews
HotelReviewSchema.methods.getRecentReviews = function(limit = 10) {
  return this.reviews
    .sort((a, b) => new Date(b.created) - new Date(a.created))
    .slice(0, limit);
};

// Instance method to get rating distribution
HotelReviewSchema.methods.getRatingDistribution = function() {
  const distribution = {
    excellent: 0, // 8-10
    good: 0,      // 6-7.9
    average: 0,   // 4-5.9
    poor: 0,      // 2-3.9
    terrible: 0   // 0-1.9
  };

  this.reviews.forEach(review => {
    if (review.rating >= 8) distribution.excellent++;
    else if (review.rating >= 6) distribution.good++;
    else if (review.rating >= 4) distribution.average++;
    else if (review.rating >= 2) distribution.poor++;
    else distribution.terrible++;
  });

  return distribution;
};

const HotelReview = mongoose.model('HotelReview', HotelReviewSchema);

module.exports = HotelReview;
