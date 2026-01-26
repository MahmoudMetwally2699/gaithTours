const mongoose = require('mongoose');

/**
 * HotelPOI Schema for storing Points of Interest data from ETG POI dumps
 *
 * This enables the "Hotel area info" section showing:
 * - Top attractions
 * - Restaurants & cafes
 * - Public transit
 * - Natural beauty
 * - Closest airports
 */

// POI item subdocument schema
const POIItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'Unspecified',
      'Continent',
      'Country',
      'Multi-Region (within a country)',
      'Province (State)',
      'Multi-City (Vicinity)',
      'City',
      'Airport',
      'Bus Station',
      'Railway Station',
      'Subway (Entrace)',
      'Neighborhood',
      'Point of Interest',
      'Multi-Railway Station',
      'Main Railway Station'
    ]
  },
  sub_type: {
    type: String,
    enum: [
      'unspecified',
      'administrative_center',
      'arenas_and_stadiums',
      'bars_and_restaurants',
      'beach',
      'buddist_temple',
      'business_center',
      'cableway',
      'casino_and_gambling',
      'church',
      'concerts_and_performances',
      'educational_objects',
      'entertainment_and_games',
      'harbor',
      'historical_poi',
      'hospital',
      'library',
      'mosque',
      'museum',
      'park',
      'shopping',
      'ski',
      'theater',
      'viewpoint',
      'water_parks_and_amusement_parks',
      'zoos_and_aquariums'
    ]
  },
  name: String,
  distance: Number // Distance in meters from the hotel
}, { _id: false });

const HotelPOISchema = new mongoose.Schema({
  // Primary identifier - matches HotelContent.hid
  hid: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },

  // Legacy string ID (optional)
  hotelId: {
    type: String,
    index: true
  },

  // Array of POI items
  poi: [POIItemSchema],

  // Data freshness
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  dumpDate: Date,
  language: {
    type: String,
    default: 'en'
  }
}, {
  timestamps: true
});

// Static method for bulk upsert from dump data
HotelPOISchema.statics.bulkUpsertFromDump = async function(poiArray) {
  const operations = poiArray.map(item => ({
    updateOne: {
      filter: { hid: item.hid },
      update: item,
      upsert: true
    }
  }));

  return this.bulkWrite(operations, { ordered: false });
};

// Static method to get POI grouped by category for display
HotelPOISchema.statics.getGroupedPOI = async function(hid) {
  const hotelPOI = await this.findOne({ hid }).lean();

  if (!hotelPOI || !hotelPOI.poi || hotelPOI.poi.length === 0) {
    return null;
  }

  // Group POI by display category
  const grouped = {
    attractions: [],      // historical_poi, museum, viewpoint, zoos_and_aquariums, arenas_and_stadiums
    restaurants: [],      // bars_and_restaurants
    transit: [],          // Railway Station, Bus Station, Subway
    naturalBeauty: [],    // beach, park
    airports: [],         // Airport
    shopping: [],         // shopping
    entertainment: []     // entertainment_and_games, concerts_and_performances, theater, casino_and_gambling
  };

  for (const poi of hotelPOI.poi) {
    const item = {
      name: poi.name,
      distance: poi.distance,
      distanceKm: poi.distance ? (poi.distance / 1000).toFixed(1) : null,
      type: poi.type,
      subType: poi.sub_type
    };

    // Categorize based on type and sub_type
    if (poi.type === 'Airport') {
      grouped.airports.push(item);
    } else if (['Railway Station', 'Bus Station', 'Subway (Entrace)', 'Multi-Railway Station', 'Main Railway Station'].includes(poi.type)) {
      grouped.transit.push(item);
    } else if (poi.sub_type === 'bars_and_restaurants') {
      grouped.restaurants.push(item);
    } else if (['beach', 'park'].includes(poi.sub_type)) {
      grouped.naturalBeauty.push(item);
    } else if (poi.sub_type === 'shopping') {
      grouped.shopping.push(item);
    } else if (['entertainment_and_games', 'concerts_and_performances', 'theater', 'casino_and_gambling', 'water_parks_and_amusement_parks'].includes(poi.sub_type)) {
      grouped.entertainment.push(item);
    } else if (['historical_poi', 'museum', 'viewpoint', 'zoos_and_aquariums', 'arenas_and_stadiums', 'church', 'mosque', 'buddist_temple'].includes(poi.sub_type)) {
      grouped.attractions.push(item);
    }
  }

  // Sort each category by distance
  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => (a.distance || 0) - (b.distance || 0));
    // Limit to top 5 per category
    grouped[category] = grouped[category].slice(0, 5);
  }

  // Remove empty categories
  for (const category of Object.keys(grouped)) {
    if (grouped[category].length === 0) {
      delete grouped[category];
    }
  }

  return Object.keys(grouped).length > 0 ? grouped : null;
};

module.exports = mongoose.model('HotelPOI', HotelPOISchema);
