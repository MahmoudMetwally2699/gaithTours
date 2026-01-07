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

// Pre-save hook to generate search text
HotelContentSchema.pre('save', function(next) {
  // Combine searchable fields into one text field
  this.searchText = [
    this.name,
    this.address,
    this.city,
    this.country,
    this.amenities?.join(' ')
  ].filter(Boolean).join(' ');

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
