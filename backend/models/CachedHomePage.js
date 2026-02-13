const mongoose = require('mongoose');

/**
 * CachedHomePage Model
 * Stores pre-fetched hotel data for the home page sections:
 * - "Popular near you" (type: 'suggested')
 * - "Popular 5-star hotels in Saudi Arabia" (type: 'popular')
 *
 * Populated by the background cache warmer job, read by the API endpoints.
 * This eliminates per-user RateHawk API calls on every home page visit.
 */
const CachedHomePageSchema = new mongoose.Schema({
  // 'suggested' or 'popular'
  type: {
    type: String,
    required: true,
    enum: ['suggested', 'popular'],
    index: true
  },

  // Cache key, e.g. "Makkah:USD:en" or "popular:SAR:ar"
  key: {
    type: String,
    required: true,
    index: true
  },

  // Array of hotel objects (same shape as the API response)
  hotels: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },

  // Additional metadata (source, destination, searchDates, etc.)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true // adds createdAt and updatedAt
});

// Compound unique index: one document per type+key
CachedHomePageSchema.index({ type: 1, key: 1 }, { unique: true });

// TTL index: auto-delete documents older than 2 hours (safety net)
CachedHomePageSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 7200 });

/**
 * Upsert cached data for a given type and key
 */
CachedHomePageSchema.statics.upsertCache = async function (type, key, hotels, metadata = {}) {
  return this.findOneAndUpdate(
    { type, key },
    { hotels, metadata, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

/**
 * Get cached data if fresh enough (maxAge in milliseconds, default 45 min)
 */
CachedHomePageSchema.statics.getFreshCache = async function (type, key, maxAgeMs = 45 * 60 * 1000) {
  const doc = await this.findOne({ type, key });
  if (!doc) return null;

  const age = Date.now() - doc.updatedAt.getTime();
  if (age > maxAgeMs) return null;

  return doc;
};

module.exports = mongoose.model('CachedHomePage', CachedHomePageSchema);
