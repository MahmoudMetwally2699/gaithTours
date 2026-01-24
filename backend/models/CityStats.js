const mongoose = require('mongoose');

/**
 * CityStats Schema for pre-computed city hotel statistics
 * This eliminates expensive countDocuments() calls during search
 *
 * Performance: O(1) lookup vs O(n) countDocuments scan
 */
const CityStatsSchema = new mongoose.Schema({
  // Normalized city name for fast lookups (lowercase, trimmed)
  cityNormalized: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Original display name (preserves case)
  cityDisplay: {
    type: String,
    required: true
  },

  // Country information
  countryCode: String,
  country: String,

  // Hotel counts
  totalHotels: {
    type: Number,
    default: 0
  },
  ratedHotels: {
    type: Number,
    default: 0  // Hotels with starRating > 0
  },

  // Star rating breakdown for filtered queries
  starCounts: {
    1: { type: Number, default: 0 },
    2: { type: Number, default: 0 },
    3: { type: Number, default: 0 },
    4: { type: Number, default: 0 },
    5: { type: Number, default: 0 }
  },

  // Data freshness
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for country + city lookups
CityStatsSchema.index({ countryCode: 1, cityNormalized: 1 });

/**
 * Static method to get hotel count for a city
 * Supports optional star rating filter
 *
 * @param {string} cityName - City name (case-insensitive)
 * @param {number[]} starFilter - Optional array of star ratings to filter by
 * @returns {Promise<number>} - Hotel count
 */
CityStatsSchema.statics.getCount = async function(cityName, starFilter = []) {
  if (!cityName) return 0;

  const normalized = cityName.toLowerCase().trim();
  const stats = await this.findOne({ cityNormalized: normalized }).lean();

  if (!stats) return 0;

  // If star filter is provided, sum only those star counts
  if (starFilter && starFilter.length > 0) {
    let count = 0;
    for (const star of starFilter) {
      if (star >= 1 && star <= 5) {
        count += stats.starCounts[star] || 0;
      }
    }
    return count;
  }

  // Default: return rated hotels count (excludes unrated)
  return stats.ratedHotels || 0;
};

/**
 * Static method to get full stats for a city
 *
 * @param {string} cityName - City name (case-insensitive)
 * @returns {Promise<Object|null>} - Full city stats or null
 */
CityStatsSchema.statics.getStats = async function(cityName) {
  if (!cityName) return null;

  const normalized = cityName.toLowerCase().trim();
  return this.findOne({ cityNormalized: normalized }).lean();
};

/**
 * Static method to upsert city stats
 *
 * @param {Object} cityData - City statistics data
 * @returns {Promise<Object>} - Updated city stats
 */
CityStatsSchema.statics.upsertStats = async function(cityData) {
  const normalized = cityData.city.toLowerCase().trim();

  return this.findOneAndUpdate(
    { cityNormalized: normalized },
    {
      cityNormalized: normalized,
      cityDisplay: cityData.city,
      countryCode: cityData.countryCode || '',
      country: cityData.country || '',
      totalHotels: cityData.totalHotels || 0,
      ratedHotels: cityData.ratedHotels || 0,
      starCounts: cityData.starCounts || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('CityStats', CityStatsSchema);
