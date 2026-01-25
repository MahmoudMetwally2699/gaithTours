const mongoose = require('mongoose');

/**
 * HotelContent Schema for storing static hotel data from ETG dumps
 * This eliminates the need for Content API calls during live search
 *
 * ETG Certification Issue #3: Search Workflow
 */
const HotelContentSchema = new mongoose.Schema({
  // Primary identifiers
  hid: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  hotelId: {
    type: String, // ETG hotel string ID (e.g., "millennium_al_masar")
    index: true
  },

  // Basic hotel info
  name: {
    type: String,
    required: true
  },
  address: String,
  city: String,
  // Normalized city name for fast indexed lookups (auto-set via pre-save hook)
  cityNormalized: {
    type: String,
    index: true
  },
  country: String,
  countryCode: String,

  // Location
  latitude: Number,
  longitude: Number,

  // Star rating (1-5)
  starRating: {
    type: Number,
    min: 1,
    max: 5
  },

  // Images
  images: [{
    url: String,
    category: String   // room, lobby, exterior, etc.
  }],
  mainImage: String,

  // Description
  description: String,
  descriptionStruct: [{
    title: String,
    paragraphs: [String]
  }],

  // Amenities (grouped)
  amenityGroups: [{
    groupName: String,
    amenities: [String]
  }],

  // Flat list of all amenities for quick lookup
  amenities: [String],

  // Room groups with images and amenities
  roomGroups: [{
    name: String,
    images: [{
      url: String
    }],
    roomAmenities: [String],
    bedGroups: [{
      type: String,
      count: Number
    }]
  }],

  // Hotel policies
  checkInTime: String,
  checkOutTime: String,
  metapolicyExtraInfo: String,
  metapolicyStruct: {
    type: mongoose.Schema.Types.Mixed // Flexible structure for policy data
  },

  // Additional facts
  facts: {
    type: mongoose.Schema.Types.Mixed
  },

  // Data freshness
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  dumpDate: Date, // Date of the ETG data dump this came from
  dumpVersion: String,

  // For search optimization
  searchText: {
    type: String,
    index: 'text'
  }
}, {
  timestamps: true
});

// Compound index for region-based queries
HotelContentSchema.index({ countryCode: 1, city: 1 });
// Single index for city-based counts and lookups (Critical for performance with 4M records)
HotelContentSchema.index({ city: 1 });
// Compound index for city + starRating queries (10-20x faster for filtered city searches)
HotelContentSchema.index({ city: 1, starRating: -1 });
// Compound index for cityNormalized queries (avoids regex, uses direct index lookup)
HotelContentSchema.index({ cityNormalized: 1, starRating: -1 });
// Name index for prefix-based autocomplete (fast "starts with" queries)
HotelContentSchema.index({ name: 1 });

// Static method for FAST autocomplete search
// Uses ONLY indexed queries - no slow regex on 4M records!
HotelContentSchema.statics.smartSearch = async function(query, limit = 10, language = 'en') {
  const normalizedQuery = query.toLowerCase().trim();

  if (normalizedQuery.length < 2) return { hotels: [], regions: [] };

  const startTime = Date.now();
  let results = [];

  try {
    // STRATEGY 1: Use MongoDB text search (uses text index, very fast)
    // This is the ONLY strategy - text search is indexed and fast
    results = await this.find(
      { $text: { $search: normalizedQuery } },
      { score: { $meta: 'textScore' } }
    )
      .select('hid hotelId name city country starRating mainImage')
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .maxTimeMS(500) // Timeout after 500ms - never block autocomplete
      .lean();

  } catch (textSearchError) {
    // Text search failed (no index or timeout), try fast city lookup
    console.log(`   ⚠️ Text search failed: ${textSearchError.message}`);

    try {
      // FALLBACK: Fast indexed city lookup (cityNormalized is indexed)
      results = await this.find({ cityNormalized: normalizedQuery })
        .select('hid hotelId name city country starRating mainImage')
        .limit(limit)
        .maxTimeMS(500)
        .lean();
    } catch (cityError) {
      console.log(`   ⚠️ City lookup failed: ${cityError.message}`);
      results = [];
    }
  }

  console.log(`   ⚡ DB query took ${Date.now() - startTime}ms for "${normalizedQuery}"`);

  // Format results
  const hotels = results.map(hotel => ({
    id: hotel.hotelId || `hid_${hotel.hid}`,
    hid: hotel.hid,
    name: hotel.name,
    type: 'hotel',
    location: `${hotel.city || ''}, ${hotel.country || ''}`.replace(/^, |, $/g, ''),
    city: hotel.city,
    country: hotel.country,
    starRating: hotel.starRating,
    image: hotel.mainImage?.replace('{size}', '240x240')
  }));

  // Extract unique cities for region suggestions
  const citySet = new Map();
  for (const hotel of hotels) {
    if (hotel.city && !citySet.has(hotel.city.toLowerCase())) {
      citySet.set(hotel.city.toLowerCase(), {
        id: `city_${hotel.city.toLowerCase().replace(/\s+/g, '_')}`,
        name: hotel.city,
        type: 'city',
        country_code: hotel.country
      });
    }
  }

  return {
    hotels: hotels.slice(0, limit),
    regions: Array.from(citySet.values()).slice(0, 5)
  };
};

// Pre-save hook to generate search text and cityNormalized
HotelContentSchema.pre('save', function(next) {
  // Combine searchable fields into one text field
  this.searchText = [
    this.name,
    this.address,
    this.city,
    this.country,
    this.amenities?.join(' ')
  ].filter(Boolean).join(' ');

  // Set normalized city for fast indexed lookups (avoids regex)
  if (this.city) {
    this.cityNormalized = this.city.toLowerCase().trim();
  }

  next();
});

// Static method to upsert from dump data
HotelContentSchema.statics.upsertFromDump = async function(hotelData) {
  return this.findOneAndUpdate(
    { hid: hotelData.hid },
    hotelData,
    { upsert: true, new: true }
  );
};

// Static method for batch upsert
HotelContentSchema.statics.bulkUpsertFromDump = async function(hotelsArray) {
  const operations = hotelsArray.map(hotel => ({
    updateOne: {
      filter: { hid: hotel.hid },
      update: hotel,
      upsert: true
    }
  }));

  return this.bulkWrite(operations, { ordered: false });
};

// Instance method to get formatted images
HotelContentSchema.methods.getFormattedImages = function(size = '640x400') {
  return this.images
    .map(img => img.url?.replace('{size}', size))
    .filter(Boolean);
};

module.exports = mongoose.model('HotelContent', HotelContentSchema);
