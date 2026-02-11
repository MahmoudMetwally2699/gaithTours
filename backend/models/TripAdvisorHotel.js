const mongoose = require('mongoose');

/**
 * TripAdvisor Hotel Schema
 * Stores TripAdvisor ratings, reviews, and details for hotels.
 * Data is fetched once from TripAdvisor API and stored permanently.
 * Lookup is done by hotel name + city to match with our RateHawk hotels.
 */
const TripAdvisorHotelSchema = new mongoose.Schema({
  // TripAdvisor location ID
  location_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Hotel name as returned by TripAdvisor
  name: {
    type: String,
    required: true
  },

  // Normalized hotel name (lowercase, trimmed) for matching
  name_normalized: {
    type: String,
    required: true,
    index: true
  },

  // City/destination used in the search
  city: {
    type: String,
    required: true,
    index: true
  },

  // City normalized for matching
  city_normalized: {
    type: String,
    required: true,
    index: true
  },

  // TripAdvisor rating (1-5 scale, mapped to bubble rating)
  rating: {
    type: Number,
    min: 0,
    max: 5
  },

  // Rating image URL (TripAdvisor bubble rating image)
  rating_image_url: {
    type: String
  },

  // Total number of reviews on TripAdvisor
  num_reviews: {
    type: String,
    default: '0'
  },

  // TripAdvisor ranking string (e.g., "#5 of 200 hotels in Cairo")
  ranking: {
    type: String
  },

  // Price level (e.g., "$", "$$", "$$$")
  price_level: {
    type: String
  },

  // TripAdvisor web URL for this hotel
  web_url: {
    type: String
  },

  // Full address
  address: {
    street1: String,
    street2: String,
    city: String,
    state: String,
    country: String,
    postalcode: String,
    address_string: String
  },

  // Coordinates
  latitude: String,
  longitude: String,

  // Subcategory (e.g., "hotel", "inn", "resort")
  subcategory: [{
    name: String,
    localized_name: String
  }],

  // Awards
  awards: [{
    award_type: String,
    year: String,
    images: {
      small: String,
      large: String
    },
    display_name: String
  }],

  // Reviews (up to 5 most recent)
  reviews: [{
    id: String,
    lang: String,
    location_id: String,
    published_date: String,
    rating: Number,
    helpful_votes: String,
    rating_image_url: String,
    url: String,
    text: String,
    title: String,
    trip_type: String,
    travel_date: String,
    user: {
      username: String,
      user_location: {
        name: String,
        id: String
      },
      avatar: {
        thumbnail: String,
        small: String,
        medium: String,
        large: String,
        original: String
      }
    },
    subratings: mongoose.Schema.Types.Mixed
  }],

  // When this record was first created
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'tripadvisor_hotels'
});

// Compound index for efficient lookup by name + city
TripAdvisorHotelSchema.index({ name_normalized: 1, city_normalized: 1 });

// Text index for fuzzy searching
TripAdvisorHotelSchema.index({ name: 'text' });

/**
 * Static method to find a TripAdvisor hotel by name and city
 */
TripAdvisorHotelSchema.statics.findByNameAndCity = async function(hotelName, city) {
  const nameNorm = hotelName.toLowerCase().trim();
  const cityNorm = city.toLowerCase().trim();

  // Try exact match first
  let result = await this.findOne({
    name_normalized: nameNorm,
    city_normalized: cityNorm
  });

  if (result) return result;

  // Try partial match (hotel name contains or is contained by the search)
  result = await this.findOne({
    city_normalized: cityNorm,
    $or: [
      { name_normalized: { $regex: nameNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      { name_normalized: { $regex: nameNorm.split(' ').slice(0, 3).join('.*'), $options: 'i' } }
    ]
  });

  return result;
};

/**
 * Static method to find multiple hotels by names and city
 */
TripAdvisorHotelSchema.statics.findByNamesAndCity = async function(hotelNames, city) {
  const cityNorm = city.toLowerCase().trim();
  const namesNorm = hotelNames.map(n => n.toLowerCase().trim());

  return this.find({
    name_normalized: { $in: namesNorm },
    city_normalized: cityNorm
  });
};

const TripAdvisorHotel = mongoose.model('TripAdvisorHotel', TripAdvisorHotelSchema);

module.exports = TripAdvisorHotel;
