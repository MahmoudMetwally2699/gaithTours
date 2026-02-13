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

  // All search names/aliases this hotel has been looked up by (normalized)
  search_names: [{
    type: String,
    index: true
  }],

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

// Index for search_names alias lookup
TripAdvisorHotelSchema.index({ search_names: 1, city_normalized: 1 });

// Text index for fuzzy searching
TripAdvisorHotelSchema.index({ name: 'text' });

// Common city name aliases for matching
const CITY_ALIASES = {
  'mecca': ['makkah', 'makkah al mukarramah', 'mekka'],
  'makkah': ['mecca', 'makkah al mukarramah', 'mekka'],
  'medina': ['madinah', 'al madinah', 'al-madinah'],
  'madinah': ['medina', 'al madinah', 'al-madinah'],
  'jeddah': ['jidda', 'jiddah', 'jedda'],
  'jidda': ['jeddah', 'jiddah', 'jedda'],
  'riyadh': ['riad', 'ar-riyad'],
  'cairo': ['al qahirah', 'al-qahira'],
};

function getCityVariants(city) {
  const cityNorm = city.toLowerCase().trim();
  const variants = [cityNorm];
  if (CITY_ALIASES[cityNorm]) {
    variants.push(...CITY_ALIASES[cityNorm]);
  }
  return variants;
}

/**
 * Static method to find a TripAdvisor hotel by name and city
 */
TripAdvisorHotelSchema.statics.findByNameAndCity = async function(hotelName, city) {
  const nameNorm = hotelName.toLowerCase().trim();
  const cityVariants = getCityVariants(city);

  // Try exact name match (name_normalized OR search_names OR raw name) with city aliases
  let result = await this.findOne({
    $or: [
      { name_normalized: nameNorm },
      { search_names: nameNorm },
      { name: hotelName } // Check raw name exactly
    ],
    city_normalized: { $in: cityVariants }
  });

  if (result) return result;

  // Try partial match (hotel name contains or is contained by the search)
  const nameEscaped = nameNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nameKeywords = nameNorm.split(' ').slice(0, 3).join('.*');
  result = await this.findOne({
    city_normalized: { $in: cityVariants },
    $or: [
      { name_normalized: { $regex: nameEscaped, $options: 'i' } },
      { name_normalized: { $regex: nameKeywords, $options: 'i' } },
      { search_names: { $regex: nameEscaped, $options: 'i' } },
      { search_names: { $regex: nameKeywords, $options: 'i' } },
      { name: { $regex: nameEscaped, $options: 'i' } } // Check raw name regex
    ]
  });

  if (result) return result;

  // Last resort: try name-only match (ignore city)
  result = await this.findOne({
    $or: [
      { name_normalized: nameNorm },
      { search_names: nameNorm },
      { name: { $regex: nameEscaped, $options: 'i' } } // Check raw name regex
    ]
  });
  if (result) return result;

  // Last resort: regex on name only
  result = await this.findOne({
    $or: [
      { name_normalized: { $regex: nameEscaped, $options: 'i' } },
      { name_normalized: { $regex: nameKeywords, $options: 'i' } },
      { search_names: { $regex: nameEscaped, $options: 'i' } },
      { search_names: { $regex: nameKeywords, $options: 'i' } }
    ]
  });

  return result;
};

/**
 * Static method to find multiple hotels by names and city
 */
TripAdvisorHotelSchema.statics.findByNamesAndCity = async function(hotelNames, city) {
  const cityVariants = getCityVariants(city);
  const namesNorm = hotelNames.map(n => n.toLowerCase().trim());

  // First try with city constraint
  const withCity = await this.find({
    $or: [
      { name_normalized: { $in: namesNorm } },
      { search_names: { $in: namesNorm } },
      { name: { $in: hotelNames } } // Check raw names exactly
    ],
    city_normalized: { $in: cityVariants }
  });

  // Check which names were NOT matched
  const matchedNames = new Set();
  withCity.forEach(ta => {
    matchedNames.add(ta.name_normalized);
    if (ta.search_names) {
      ta.search_names.forEach(alias => matchedNames.add(alias));
    }
    if (ta.name) {
      matchedNames.add(ta.name.toLowerCase().trim());
    }
  });
  const unmatchedNorms = namesNorm.filter(n => !matchedNames.has(n));
  const unmatchedRaw = hotelNames.filter(n => !matchedNames.has(n.toLowerCase().trim()));

  if (unmatchedNorms.length === 0) return withCity;

  // Try unmatched names WITHOUT city constraint (fallback for city mismatches)
  const withoutCity = await this.find({
    $or: [
      { name_normalized: { $in: unmatchedNorms } },
      { search_names: { $in: unmatchedNorms } },
      { name: { $in: unmatchedRaw } }
    ]
  });

  return [...withCity, ...withoutCity];
};

const TripAdvisorHotel = mongoose.model('TripAdvisorHotel', TripAdvisorHotelSchema);

module.exports = TripAdvisorHotel;
