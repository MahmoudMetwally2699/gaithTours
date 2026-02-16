const express = require('express');
const { protect } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');
const rateHawkService = require('../utils/RateHawkService');
const tripadvisorService = require('../utils/tripadvisorService');

const jwt = require('jsonwebtoken'); // Added for optional auth
const User = require('../models/User'); // Added for user history
const router = express.Router();

// In-memory cache for hotel search results with longer TTL
let hotelSearchCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Cache for city hotel counts (rarely changes)
let cityCountCache = new Map();
const CITY_COUNT_TTL = 60 * 60 * 1000; // 1 hour

// Cache for hotel STATIC content only (images, amenities, description, reviews, POI)
// Rates/prices are NEVER cached — always fetched fresh from RateHawk
let hotelStaticCache = new Map();
const HOTEL_STATIC_CACHE_TTL = 30 * 60 * 1000; // 30 minutes (static data rarely changes)

function getHotelStaticCache(hid) {
  const cached = hotelStaticCache.get(hid);
  if (cached && Date.now() - cached.timestamp < HOTEL_STATIC_CACHE_TTL) {
    return cached.data;
  }
  hotelStaticCache.delete(hid); // Clean expired
  return null;
}

function setHotelStaticCache(hid, data) {
  hotelStaticCache.set(hid, { data, timestamp: Date.now() });
  // Evict oldest entries if cache grows too large (max 300 hotels)
  if (hotelStaticCache.size > 300) {
    const oldestKey = hotelStaticCache.keys().next().value;
    hotelStaticCache.delete(oldestKey);
  }
}

// Helper to get/set cache
function getCachedResults(key) {
  const cached = hotelSearchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedResults(key, data) {
  hotelSearchCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Get hotel count for a city from LOCAL DB
 * GET /api/hotels/city-count?city=Makkah
 */
router.get('/city-count', async (req, res) => {
  try {
    const city = req.query.city || 'Makkah';
    const cityNorm = city.toLowerCase().trim();

    // Check in-memory cache
    const cacheKey = `cityCount:${cityNorm}`;
    const cached = cityCountCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CITY_COUNT_TTL) {
      res.set('Cache-Control', 'public, max-age=3600');
      return successResponse(res, { count: cached.count, city }, 'City count from cache');
    }

    const HotelContent = require('../models/HotelContent');

    // Try CityStats first, then countDocuments as fallback
    let count = 0;
    try {
      const CityStats = require('../models/CityStats');
      count = await CityStats.getCount(cityNorm);
    } catch {
      count = await HotelContent.countDocuments({ cityNormalized: cityNorm }).maxTimeMS(3000);
    }

    cityCountCache.set(cacheKey, { count, timestamp: Date.now() });

    res.set('Cache-Control', 'public, max-age=3600');
    successResponse(res, { count, city }, 'City count retrieved');
  } catch (error) {
    console.error('City count error:', error.message);
    errorResponse(res, 'Failed to get city count', 500);
  }
});

/**
 * Get hotels for home page from LOCAL DB (no external API calls = instant)
 * GET /api/hotels/suggested-local?city=Makkah&language=en
 */
const suggestedLocalCache = new Map();
const SUGGESTED_LOCAL_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

router.get('/suggested-local', async (req, res) => {
  try {
    const city = req.query.city || req.query.location || 'Makkah';
    const language = req.query.language || 'en';
    const limit = Math.min(parseInt(req.query.limit) || 8, 20);
    const FALLBACK_CITY = 'Makkah';

    // Check in-memory cache first (avoids hitting MongoDB entirely for repeated requests)
    const memoryCacheKey = `${city.toLowerCase().trim()}:${language}:${limit}`;
    const memoryCached = suggestedLocalCache.get(memoryCacheKey);
    if (memoryCached && Date.now() - memoryCached.timestamp < SUGGESTED_LOCAL_CACHE_TTL) {
      res.set('Cache-Control', 'public, max-age=3600');
      return successResponse(res, memoryCached.data, 'Local suggestions from memory cache');
    }

    const HotelContent = require('../models/HotelContent');
    const TripAdvisorHotel = require('../models/TripAdvisorHotel');

    // Fast indexed query on cityNormalized + starRating
    let cityNorm = city.toLowerCase().trim();
    let hotels = await HotelContent.find({
      cityNormalized: cityNorm,
      starRating: { $gte: 3 }
    })
      .select('hid hotelId name nameAr address city country starRating mainImage images')
      .sort({ starRating: -1 })
      .limit(limit * 3) // Fetch extra to filter out missing images
      .maxTimeMS(3000)
      .lean();

    // Fallback: if no results for detected city, use Makkah (indexed exact match only, no regex on 4M docs)
    if (hotels.length === 0 && cityNorm !== FALLBACK_CITY.toLowerCase()) {
      console.log(`⚠️ No hotels for "${city}", falling back to ${FALLBACK_CITY}`);
      hotels = await HotelContent.find({
        cityNormalized: FALLBACK_CITY.toLowerCase(),
        starRating: { $gte: 3 }
      })
        .select('hid hotelId name nameAr address city country starRating mainImage images')
        .sort({ starRating: -1 })
        .limit(limit * 3)
        .maxTimeMS(3000)
        .lean();
    }

    // Format for frontend
    const formatted = hotels
      .filter(h => h.mainImage && !h.mainImage.includes('placeholder'))
      .slice(0, limit)
      .map(h => ({
        id: h.hotelId || `hid_${h.hid}`,
        hid: h.hid,
        name: h.name,
        nameAr: h.nameAr || null,
        address: h.address || h.city,
        city: h.city,
        country: h.country,
        star_rating: h.starRating,
        rating: h.starRating ? h.starRating * 2 : 0,
        image: h.mainImage?.replace('{size}', '640x400'),
      }));

    // Enrich with TripAdvisor data
    try {
      const names = formatted.map(h => h.name);
      const taResults = await TripAdvisorHotel.findByNamesAndCity(names, city);
      const taMap = {};
      taResults.forEach(ta => {
        taMap[ta.name_normalized] = ta;
        if (ta.search_names) ta.search_names.forEach(alias => { taMap[alias] = ta; });
      });
      formatted.forEach(h => {
        const ta = taMap[h.name.toLowerCase().trim()];
        if (ta) {
          h.tripadvisor_rating = ta.rating;
          h.tripadvisor_num_reviews = ta.num_reviews;
          h.tripadvisor_location_id = ta.location_id;
        }
      });
    } catch (taError) {
      console.error('TA enrichment error (non-fatal):', taError.message);
    }

    // Determine source
    let source = 'location';
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.lastSearchDestination) {
          source = 'history';
        }
      } catch { /* optional auth */ }
    }
    if (!req.query.city && !req.query.location) source = 'fallback';

    const responseData = {
      hotels: formatted,
      source,
      destination: city,
    };

    // Cache in memory for next request
    suggestedLocalCache.set(memoryCacheKey, { data: responseData, timestamp: Date.now() });

    res.set('Cache-Control', 'public, max-age=3600');
    successResponse(res, responseData, 'Local suggestions retrieved');
  } catch (error) {
    console.error('Local suggestions error:', error);
    errorResponse(res, 'Failed to get local suggestions', 500);
  }
});

/**
 * Get popular 5-star properties from LOCAL DB (no external API calls = instant)
 * GET /api/hotels/popular-local?language=en
 */
router.get('/popular-local', async (req, res) => {
  try {
    const language = req.query.language || 'en';
    const HotelContent = require('../models/HotelContent');
    const TripAdvisorHotel = require('../models/TripAdvisorHotel');

    const cities = ['Riyadh', 'Jeddah', 'Makkah'];

    const cityPromises = cities.map(city =>
      HotelContent.find({
        cityNormalized: city.toLowerCase().trim(),
        starRating: 5,
        mainImage: { $exists: true, $ne: null, $ne: '' },
      })
        .select('hid hotelId name nameAr address city country starRating mainImage')
        .sort({ starRating: -1 })
        .limit(8)
        .maxTimeMS(1000)
        .lean()
    );

    const cityResults = await Promise.all(cityPromises);
    const allHotels = cityResults.flat()
      .filter(h => h.mainImage && !h.mainImage.includes('placeholder'))
      .slice(0, 15)
      .map(h => ({
        id: h.hotelId || `hid_${h.hid}`,
        hid: h.hid,
        name: h.name,
        nameAr: h.nameAr || null,
        address: h.address || h.city,
        city: h.city,
        country: h.country,
        star_rating: h.starRating,
        rating: h.starRating ? h.starRating * 2 : 0,
        image: h.mainImage?.replace('{size}', '640x400'),
      }));

    // Enrich with TripAdvisor data
    try {
      const hotelsByCity = {};
      allHotels.forEach(h => {
        const c = h.city || 'Saudi Arabia';
        if (!hotelsByCity[c]) hotelsByCity[c] = [];
        hotelsByCity[c].push(h);
      });
      for (const [c, cityHotels] of Object.entries(hotelsByCity)) {
        const names = cityHotels.map(h => h.name);
        const taResults = await TripAdvisorHotel.findByNamesAndCity(names, c);
        const taMap = {};
        taResults.forEach(ta => {
          taMap[ta.name_normalized] = ta;
          if (ta.search_names) ta.search_names.forEach(alias => { taMap[alias] = ta; });
        });
        cityHotels.forEach(h => {
          const ta = taMap[h.name.toLowerCase().trim()];
          if (ta) {
            h.tripadvisor_rating = ta.rating;
            h.tripadvisor_num_reviews = ta.num_reviews;
            h.tripadvisor_location_id = ta.location_id;
          }
        });
      }
    } catch (taError) {
      console.error('TA enrichment error (non-fatal):', taError.message);
    }

    res.set('Cache-Control', 'public, max-age=3600');
    successResponse(res, { hotels: allHotels }, 'Popular local properties retrieved');
  } catch (error) {
    console.error('Popular local error:', error);
    errorResponse(res, 'Failed to get popular local properties', 500);
  }
});

/**
 * Get popular 5-star properties (aggregated from multiple Saudi cities)
 * GET /api/hotels/popular-properties?currency=USD&language=en
 *
 * Dedicated endpoint to avoid 3 separate /suggested calls from the frontend.
 * Uses a longer cache (30 min) since popular properties change infrequently.
 */
const popularPropertiesCache = new Map();
const POPULAR_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

router.get('/popular-properties', async (req, res) => {
  try {
    const currency = req.query.currency || 'USD';
    const language = req.query.language || 'en';
    const cacheKey = `popular:${currency}:${language}`;

    // Check cache first
    const cached = popularPropertiesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < POPULAR_CACHE_TTL) {
      console.log(`♻️  Serving cached popular properties (${cached.data.hotels.length} hotels)`);
      res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
      return successResponse(res, cached.data, 'Popular properties from cache');
    }

    console.log(`🏨 Fetching popular 5-star properties (currency: ${currency}, language: ${language})`);

    const cities = ['Riyadh', 'Jeddah', 'Makkah'];

    // Reuse existing suggestion cache if available, otherwise fetch
    const cityPromises = cities.map(async (city) => {
      try {
        // Check the main suggestion cache first
        const suggCacheKey = `suggestions:${city}:${currency}:${language}`;
        const cachedSugg = getCachedResults(suggCacheKey);
        if (cachedSugg) {
          console.log(`   ♻️  Reusing suggestion cache for ${city}`);
          return cachedSugg.hotels || [];
        }

        // Not cached — do a full suggestion fetch (will also populate the suggestion cache)
        const suggestions = await rateHawkService.suggest(city, language);
        if (!suggestions.regions.length && !suggestions.hotels.length) return [];

        const target = suggestions.regions[0] || suggestions.hotels[0];
        const regionId = target.region_id || target.id;

        const now = new Date();
        const daysOffset = now.getHours() >= 22 ? 1 : 0;
        const dates = rateHawkService.constructor.getDefaultDates(daysOffset, 1);

        const searchResults = await rateHawkService.searchByRegion(regionId, {
          ...dates,
          adults: 2,
          currency,
          language,
          enrichmentLimit: 0,
          refreshPrices: 0,
          maxResults: 25 // Only enrich top 25 per city (we need ~5 five-star per city)
        });

        // Filter for enriched hotels
        const enriched = (searchResults.hotels || []).filter(h => {
          return h.price && h.price > 0 && h.image && !h.image.includes('placeholder') && h.name && h.isEnriched !== false;
        });

        // Also populate the suggestion cache so /suggested calls can reuse it
        const suggData = { hotels: enriched.slice(0, 9), source: 'location', destination: city, searchDates: { checkIn: dates.checkin, checkOut: dates.checkout } };
        setCachedResults(suggCacheKey, suggData);

        return enriched;
      } catch (error) {
        console.error(`   ❌ Error fetching popular hotels from ${city}:`, error.message);
        return [];
      }
    });

    const cityResults = await Promise.all(cityPromises);
    const allHotels = cityResults.flat();

    // Filter for 5-star hotels, sort, and limit
    const popularHotels = allHotels
      .filter(h => h.price && h.price > 0 && h.star_rating && h.star_rating >= 5)
      .sort((a, b) => {
        const ratingDiff = (b.star_rating || 0) - (a.star_rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (a.price || 0) - (b.price || 0);
      })
      .slice(0, 15);

    console.log(`✅ Popular properties: ${popularHotels.length} 5-star hotels from ${allHotels.length} total`);

    // Enrich with TripAdvisor data from DB
    try {
      const TripAdvisorHotel = require('../models/TripAdvisorHotel');
      // Group by city for efficient lookup
      const hotelsByCity = {};
      popularHotels.forEach(h => {
        const city = h.city || 'Saudi Arabia';
        if (!hotelsByCity[city]) hotelsByCity[city] = [];
        hotelsByCity[city].push(h);
      });

      for (const [city, cityHotels] of Object.entries(hotelsByCity)) {
        const names = cityHotels.map(h => h.name);
        const taResults = await TripAdvisorHotel.findByNamesAndCity(names, city);

        // Build lookup map by name_normalized and search_names
        const taMap = {};
        taResults.forEach(ta => {
          taMap[ta.name_normalized] = ta;
          if (ta.search_names) {
            ta.search_names.forEach(alias => { taMap[alias] = ta; });
          }
        });

        // Attach TA data to each hotel
        cityHotels.forEach(h => {
          const nameNorm = h.name.toLowerCase().trim();
          const ta = taMap[nameNorm];
          if (ta) {
            h.tripadvisor_rating = ta.rating;
            h.tripadvisor_num_reviews = ta.num_reviews;
            h.tripadvisor_location_id = ta.location_id;
            console.log(`   🏷️  TA enriched: "${h.name}" → ${ta.rating}/5, ${ta.num_reviews} reviews`);
          }
        });
      }
    } catch (taError) {
      console.error('   ⚠️ TripAdvisor enrichment error (non-fatal):', taError.message);
    }

    const responseData = { hotels: popularHotels };

    // Cache for 30 minutes
    popularPropertiesCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
    successResponse(res, responseData, 'Popular properties retrieved successfully');
  } catch (error) {
    console.error('Popular properties error:', error);
    errorResponse(res, 'Failed to get popular properties', 500);
  }
});

/**
 * Get available filter values (languages, amenities, etc.)
 * GET /api/hotels/filters
 */
router.get('/filters', async (req, res) => {
  try {
    const filters = await rateHawkService.getFilterValues();
    if (filters) {
      res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
      successResponse(res, filters, 'Filter values retrieved successfully');
    } else {
      errorResponse(res, 'Failed to retrieve filter values', 500);
    }
  } catch (error) {
    console.error('Filter values error:', error);
    errorResponse(res, 'Failed to get filter values', 500);
  }
});

/**
 * Get personalized hotel suggestions
 * GET /api/hotels/suggested
 * Optional Query: location (for guest geolocation)
 * Optional Header: Authorization (for user history)
 */
router.get('/suggested', async (req, res) => {
  try {
    let destination = null;
    let source = 'fallback'; // history, location, fallback
    const currency = req.query.currency || 'USD';
    const language = req.query.language || 'en';

    // 1. Try to get user from token
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.lastSearchDestination) {
          destination = user.lastSearchDestination;
          source = 'history';
        }
      } catch (err) {
        console.log('Optional auth failed:', err.message);
      }
    }

    // 2. If no history, check query param (geolocation from frontend)
    if (!destination && req.query.location) {
      destination = req.query.location;
      source = 'location';
    }

    // 3. Fallback
    if (!destination) {
      destination = 'Makkah'; // Default popular destination
      source = 'fallback';
    }

    console.log(`💡 Getting suggestions for: ${destination} (Source: ${source})`);

    // Check cache first (include currency and language in cache key)
    const cacheKey = `suggestions:${destination}:${currency}:${language}`;
    const cachedData = getCachedResults(cacheKey);

    if (cachedData) {
      console.log(`♻️  Serving cached results for ${destination}`);
      res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
      return successResponse(res, cachedData, 'Suggestions retrieved from cache');
    }

    // Use existing search logic (simplified)
    // First suggest to get region/hotel ID
    let suggestions;
    let searchResults = { hotels: [] };

    // Get dates for hotel search
    // If it's after 10 PM, show hotels starting from next day (people booking late want next day)
    const now = new Date();
    const currentHour = now.getHours();
    const daysOffset = currentHour >= 22 ? 1 : 0; // After 10 PM (22:00), search from tomorrow

    const dates = rateHawkService.constructor.getDefaultDates(daysOffset, 1);

    try {
      suggestions = await rateHawkService.suggest(destination, language);

      if (suggestions.regions.length > 0 || suggestions.hotels.length > 0) {
        // Pick first region or hotel
        const target = suggestions.regions[0] || suggestions.hotels[0];
        const regionId = target.region_id || target.id;

        if (daysOffset === 1) {
          console.log(`🌙 After 10 PM - Showing hotels from tomorrow (${dates.checkin})`);
        }

        // Search - smart enrichment leverages cache to serve more hotels
        // With cache, we can request more hotels without extra API calls
        // NEW: refreshPrices=0 disabled by default to avoid rate limiting
        // Only enable for critical searches or when rate limits allow
        searchResults = await rateHawkService.searchByRegion(regionId, {
          ...dates,
          adults: 2,
          currency: currency,
          language: language,
          enrichmentLimit: 0, // Local DB enrichment - no limit needed
          refreshPrices: 0, // DISABLED: Causes rate limiting with 20 parallel calls
          maxResults: 20 // Only enrich top 20 hotels (we return 9 max)
        });
      }
    } catch (error) {
      // Handle rate limiting - try to serve stale cache if available
      if (error.response && error.response.status === 429) {
        console.log(`⏰ Rate limit hit for ${destination}, checking for stale cache...`);

        // Check for stale cache (up to 1 hour old)
        const staleCached = hotelSearchCache.get(cacheKey);
        if (staleCached && Date.now() - staleCached.timestamp < 60 * 60 * 1000) {
          console.log(`✅ Serving stale cache for ${destination} (${Math.round((Date.now() - staleCached.timestamp) / 60000)} min old)`);
          res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
          return successResponse(res, staleCached.data, 'Suggestions retrieved from cache (rate limited)');
        }

        // No cache available, return error
        console.error('❌ No cached data available and rate limited');
        return errorResponse(res, 'Service temporarily unavailable. Please try again in a moment.', 429);
      }
      throw error; // Re-throw non-rate-limit errors
    }

    // Filter to only include hotels with complete enrichment data (price, name, and real images)
    const enrichedHotels = searchResults.hotels.filter(hotel => {
      const hasValidPrice = hotel.price && hotel.price > 0;
      const hasRealImage = hotel.image && !hotel.image.includes('placeholder') && !hotel.image.includes('via.placeholder');
      const hasName = hotel.name && hotel.name.length > 0;
      const wasEnriched = hotel.isEnriched !== false; // Check enrichment flag
      return hasValidPrice && hasRealImage && hasName && wasEnriched;
    });

    const filteredCount = searchResults.hotels.length - enrichedHotels.length;
    console.log(`✅ Returning ${Math.min(enrichedHotels.length, 9)} fully enriched hotels (filtered out ${filteredCount} incomplete)`);

    // Returns top 9 fully enriched hotels (frontend will show best 6 with prices)
    const suggestedHotels = enrichedHotels.slice(0, 9);

    // Enrich with TripAdvisor data from DB
    try {
      const TripAdvisorHotel = require('../models/TripAdvisorHotel');
      const hotelsByCity = {};
      suggestedHotels.forEach(h => {
        const c = h.city || destination || 'Saudi Arabia';
        if (!hotelsByCity[c]) hotelsByCity[c] = [];
        hotelsByCity[c].push(h);
      });

      for (const [c, cityHotels] of Object.entries(hotelsByCity)) {
        const names = cityHotels.map(h => h.name);
        const taResults = await TripAdvisorHotel.findByNamesAndCity(names, c);
        const taMap = {};
        taResults.forEach(ta => {
          taMap[ta.name_normalized] = ta;
          if (ta.search_names) {
            ta.search_names.forEach(alias => { taMap[alias] = ta; });
          }
        });
        cityHotels.forEach(h => {
          const nameNorm = h.name.toLowerCase().trim();
          const ta = taMap[nameNorm];
          if (ta) {
            h.tripadvisor_rating = ta.rating;
            h.tripadvisor_num_reviews = ta.num_reviews;
            h.tripadvisor_location_id = ta.location_id;
          }
        });
      }
    } catch (taError) {
      console.error('   ⚠️ TripAdvisor enrichment error (non-fatal):', taError.message);
    }

    const responseData = {
      hotels: suggestedHotels,
      source,
      destination,
      // Include the actual search dates so frontend can use them in detail page links
      searchDates: {
        checkIn: dates.checkin,
        checkOut: dates.checkout
      }
    };

    // Cache the successful result
    setCachedResults(cacheKey, responseData);

    res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
    successResponse(res, responseData, 'Suggestions retrieved successfully');

  } catch (error) {
    console.error('Suggestions error:', error);
    errorResponse(res, 'Failed to get suggestions', 500);
  }
});

/**
 * Suggest hotels and regions worldwide (autocomplete)
 * GET /api/hotels/suggest?query=ewaa
 *
 * Hybrid approach for speed + comprehensiveness:
 * 1. Local DB search first (fast, ~50ms)
 * 2. RateHawk API fallback (when local results insufficient)
 */

// In-memory suggestion cache for ultra-fast repeat queries
const suggestionResultCache = new Map();
const SUGGESTION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Bilingual city name mapping (Arabic → English, English → Arabic)
// This enables searching "القاهره" to find "Cairo" hotels and vice versa
const CITY_TRANSLATIONS = {
  // Egypt
  'القاهره': 'cairo', 'القاهرة': 'cairo', 'cairo': 'القاهرة',
  'الإسكندرية': 'alexandria', 'اسكندرية': 'alexandria', 'alexandria': 'الإسكندرية',
  'الجيزة': 'giza', 'giza': 'الجيزة',
  'شرم الشيخ': 'sharm el sheikh', 'sharm el sheikh': 'شرم الشيخ', 'sharm': 'شرم الشيخ',
  'الغردقة': 'hurghada', 'hurghada': 'الغردقة',
  'الأقصر': 'luxor', 'luxor': 'الأقصر',
  'أسوان': 'aswan', 'aswan': 'أسوان',

  // Saudi Arabia
  'مكة': 'makkah', 'مكه': 'makkah', 'مكة المكرمة': 'makkah', 'makkah': 'مكة', 'mecca': 'مكة',
  'المدينة': 'medina', 'المدينه': 'medina', 'المدينة المنورة': 'medina', 'medina': 'المدينة',
  'الرياض': 'riyadh', 'riyadh': 'الرياض',
  'جدة': 'jeddah', 'جده': 'jeddah', 'jeddah': 'جدة',
  'الدمام': 'dammam', 'dammam': 'الدمام',
  'الخبر': 'khobar', 'khobar': 'الخبر',
  'الطائف': 'taif', 'taif': 'الطائف',
  'ينبع': 'yanbu', 'yanbu': 'ينبع',
  'أبها': 'abha', 'abha': 'أبها',

  // UAE
  'دبي': 'dubai', 'dubai': 'دبي',
  'أبوظبي': 'abu dhabi', 'ابوظبي': 'abu dhabi', 'abu dhabi': 'أبوظبي',
  'الشارقة': 'sharjah', 'sharjah': 'الشارقة',
  'عجمان': 'ajman', 'ajman': 'عجمان',
  'رأس الخيمة': 'ras al khaimah', 'ras al khaimah': 'رأس الخيمة',

  // Other Gulf & Middle East
  'الدوحة': 'doha', 'doha': 'الدوحة',
  'المنامة': 'manama', 'manama': 'المنامة',
  'الكويت': 'kuwait', 'kuwait': 'الكويت',
  'مسقط': 'muscat', 'muscat': 'مسقط',
  'عمان': 'amman', 'amman': 'عمان',
  'بيروت': 'beirut', 'beirut': 'بيروت',
  'دمشق': 'damascus', 'damascus': 'دمشق',
  'القدس': 'jerusalem', 'jerusalem': 'القدس',
  'اسطنبول': 'istanbul', 'istanbul': 'اسطنبول',

  // North Africa
  'الدار البيضاء': 'casablanca', 'casablanca': 'الدار البيضاء',
  'مراكش': 'marrakech', 'marrakech': 'مراكش',
  'تونس': 'tunis', 'tunis': 'تونس',
  'طرابلس': 'tripoli', 'tripoli': 'طرابلس',
  'الجزائر': 'algiers', 'algiers': 'الجزائر',

  // Europe & International
  'لندن': 'london', 'london': 'لندن',
  'باريس': 'paris', 'paris': 'باريس',
  'روما': 'rome', 'rome': 'روما',
  'برشلونة': 'barcelona', 'barcelona': 'برشلونة',
  'مدريد': 'madrid', 'madrid': 'مدريد',
  'فيينا': 'vienna', 'vienna': 'فيينا',
  'موسكو': 'moscow', 'moscow': 'موسكو',

  // Asia
  'بانكوك': 'bangkok', 'bangkok': 'بانكوك',
  'طوكيو': 'tokyo', 'tokyo': 'طوكيو',
  'سنغافورة': 'singapore', 'singapore': 'سنغافورة',
  'كوالالمبور': 'kuala lumpur', 'kuala lumpur': 'كوالالمبور',
  'جاكرتا': 'jakarta', 'jakarta': 'جاكرتا',
  'مومباي': 'mumbai', 'mumbai': 'مومباي',
  'دلهي': 'delhi', 'delhi': 'دلهي'
};

// Common Arabic hotel/travel terms
const TERM_TRANSLATIONS = {
  'فندق': 'hotel',
  'فنادق': 'hotels',
  'منتجع': 'resort',
  'شقق': 'apartments',
  'شقة': 'apartment',
  'سوق': 'souq'
};

/**
 * Smart query translation - translates Arabic queries to English equivalents
 * @param {string} query - User search query
 * @returns {Object} { originalQuery, translatedQuery, isTranslated, translationUsed }
 */
function translateQuery(query) {
  const normalized = query.toLowerCase().trim();

  // Check for exact city match first
  if (CITY_TRANSLATIONS[normalized]) {
    return {
      originalQuery: query,
      translatedQuery: CITY_TRANSLATIONS[normalized],
      isTranslated: true,
      translationType: 'city'
    };
  }

  // Check if query contains a known city name (for multi-word queries like "فندق القاهرة")
  let translated = normalized;
  let wasTranslated = false;

  // Replace city names
  for (const [arabic, english] of Object.entries(CITY_TRANSLATIONS)) {
    if (/[\u0600-\u06FF]/.test(arabic) && normalized.includes(arabic)) {
      translated = translated.replace(arabic, english);
      wasTranslated = true;
    }
  }

  // Replace common terms
  for (const [arabic, english] of Object.entries(TERM_TRANSLATIONS)) {
    if (normalized.includes(arabic)) {
      translated = translated.replace(arabic, english);
      wasTranslated = true;
    }
  }

  return {
    originalQuery: query,
    translatedQuery: wasTranslated ? translated.trim() : query,
    isTranslated: wasTranslated,
    translationType: wasTranslated ? 'partial' : 'none'
  };
}

router.get('/suggest', async (req, res) => {
  const startTime = Date.now();
  try {
    const { query, language = 'en' } = req.query;

    if (!query || query.length < 2) {
      return errorResponse(res, 'Query must be at least 2 characters', 400);
    }

    // Smart detection: If query contains Arabic characters, use 'ar' regardless of requested language
    let finalLanguage = language;
    if (query && /[\u0600-\u06FF]/.test(query)) {
      finalLanguage = 'ar';
    }

    const normalizedQuery = query.toLowerCase().trim();

    // SMART TRANSLATION: Translate Arabic queries to English for better matching
    const translation = translateQuery(query);
    const searchQueries = [query]; // Always search original
    if (translation.isTranslated && translation.translatedQuery !== query.toLowerCase()) {
      searchQueries.push(translation.translatedQuery);
      console.log(`🌐 Translated: "${query}" → "${translation.translatedQuery}" (${translation.translationType})`);
    }

    const cacheKey = `${normalizedQuery}_${finalLanguage}`;

    // Check in-memory cache first (instant, <1ms)
    const cached = suggestionResultCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SUGGESTION_CACHE_TTL) {
      console.log(`⚡ Suggest cache hit for "${query}" (${Date.now() - startTime}ms)`);
      return successResponse(res, cached.data, 'Suggestions retrieved from cache');
    }

    console.log(`🔍 Smart suggest for: "${query}" (Language: ${finalLanguage})`);

    // NEW STRATEGY: API is PRIMARY (fast ~200ms), Local DB runs in parallel as bonus
    // This ensures autocomplete is always fast even if local DB is slow
    const HotelContent = require('../models/HotelContent');

    // Create timeout wrapper for local DB search (300ms max)
    const localSearchWithTimeout = async (q) => {
      return Promise.race([
        HotelContent.smartSearch(q, 10, finalLanguage),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 300))
      ]).catch(() => ({ hotels: [], regions: [] }));
    };

    // Run API and local DB in PARALLEL
    const [apiResultsRaw, localResultsRaw] = await Promise.all([
      // Primary: RateHawk API (always runs)
      Promise.all(
        searchQueries.map(q => rateHawkService.suggest(q, finalLanguage).catch(() => ({ hotels: [], regions: [] })))
      ),
      // Bonus: Local DB with 300ms timeout
      Promise.all(
        searchQueries.map(q => localSearchWithTimeout(q))
      )
    ]);

    // Merge API results
    let apiResults = { hotels: [], regions: [] };
    const seenApiHids = new Set();
    const seenApiRegions = new Set();

    for (const result of apiResultsRaw) {
      for (const hotel of result.hotels || []) {
        if (!seenApiHids.has(hotel.hid)) {
          seenApiHids.add(hotel.hid);
          apiResults.hotels.push({
            id: hotel.id,
            hid: hotel.hid,
            name: hotel.label || hotel.name || hotel.id?.replace(/_/g, ' ').toUpperCase(),
            type: hotel.type || 'hotel',
            location: hotel.location,
            coordinates: hotel.coordinates
          });
        }
      }
      for (const region of result.regions || []) {
        if (!seenApiRegions.has(region.id)) {
          seenApiRegions.add(region.id);
          apiResults.regions.push({
            id: region.id,
            name: region.name || region.label || region.id,
            type: region.type,
            location: region.location,
            country_code: region.country_code
          });
        }
      }
    }

    // Merge local DB results (bonus, may be empty if timed out)
    let localResults = { hotels: [], regions: [] };
    const seenLocalHids = new Set();

    for (const result of localResultsRaw) {
      for (const hotel of result.hotels || []) {
        if (!seenLocalHids.has(hotel.hid) && !seenApiHids.has(hotel.hid)) {
          seenLocalHids.add(hotel.hid);
          localResults.hotels.push(hotel);
        }
      }
    }

    console.log(`   🌐 API: ${apiResults.hotels.length} hotels, ${apiResults.regions.length} regions`);
    console.log(`   📦 Local: ${localResults.hotels.length} bonus hotels`);
    console.log(`   ⏱️ Total time: ${Date.now() - startTime}ms`);

    // Final merge: API first, then local bonus
    const hotels = [...apiResults.hotels, ...localResults.hotels].slice(0, 10);
    const regions = apiResults.regions.slice(0, 5);

    // Enrich all hotels with Arabic names from local DB
    try {
      const HotelContentModel = require('../models/HotelContent');
      const hids = hotels.map(h => h.hid).filter(Boolean);
      if (hids.length > 0) {
        const arabicNames = await HotelContentModel.find(
          { hid: { $in: hids }, nameAr: { $exists: true, $ne: null, $ne: '' } },
          { hid: 1, nameAr: 1 }
        ).lean();
        const arMap = {};
        arabicNames.forEach(h => { arMap[h.hid] = h.nameAr; });
        hotels.forEach(h => {
          if (h.hid && arMap[h.hid]) {
            h.nameAr = arMap[h.hid];
          }
        });
      }

      // BONUS: If query is Arabic text and we got few results, also search by nameAr directly
      if (/[\u0600-\u06FF]/.test(query) && hotels.length < 5) {
        const arabicResults = await HotelContentModel.find(
          { nameAr: { $regex: query.trim(), $options: 'i' } }
        )
          .select('hid hotelId name nameAr city country starRating mainImage')
          .limit(10)
          .maxTimeMS(500)
          .lean();

        const existingHids = new Set(hotels.map(h => h.hid));
        for (const hotel of arabicResults) {
          if (!existingHids.has(hotel.hid)) {
            existingHids.add(hotel.hid);
            hotels.push({
              id: hotel.hotelId || `hid_${hotel.hid}`,
              hid: hotel.hid,
              name: hotel.name,
              nameAr: hotel.nameAr,
              type: 'hotel',
              location: `${hotel.city || ''}, ${hotel.country || ''}`.replace(/^, |, $/g, ''),
              city: hotel.city,
              country: hotel.country,
              starRating: hotel.starRating,
              image: hotel.mainImage?.replace('{size}', '240x240')
            });
          }
        }
      }
    } catch (arErr) {
      console.log('   ⚠️ Arabic name enrichment error (non-fatal):', arErr.message);
    }

    // Add ETG Test Hotel to suggestions if user types "test"
    if (query.toLowerCase().includes('test')) {
      hotels.unshift({
        id: 'test_hotel_do_not_book',
        hid: 8473727,
        name: '🧪 ETG Test Hotel (For Certification)',
        type: 'hotel',
        location: 'Test Location',
        coordinates: null,
        isTestHotel: true
      });
    }

    const response = { hotels, regions };

    // Cache the merged result
    suggestionResultCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    console.log(`✅ Total: ${hotels.length} hotels, ${regions.length} regions (${Date.now() - startTime}ms)`);

    return successResponse(res, response, 'Suggestions retrieved successfully');

  } catch (error) {
    console.error('Error getting suggestions:', error);
    return errorResponse(res, error.message || 'Failed to get suggestions', 500);
  }
});

/**
 * Search hotels using RateHawk API
 * GET /api/hotels/search?destination=Rome&checkin=2025-01-15&checkout=2025-01-18&adults=2
 */
router.get('/search', async (req, res) => {
  try {
    const searchStartTime = Date.now();
    const {
      destination,
      checkin,
      checkout,
      adults = 2,
      children = 0,
      page = 1,
      limit = 20,
      currency = 'USD',
      language = 'en',
      starRating = '', // Comma-separated star ratings, e.g., "2,3,4"
      facilities = '', // Comma-separated facilities, e.g., "free_breakfast,free_wifi"
      mealPlan = '', // Comma-separated meal plans, e.g., "breakfast,half_board"
      cancellationPolicy = '', // "free_cancellation" or "non_refundable"
      guestRating = '' // Minimum guest rating, e.g., "7", "8", "9"
    } = req.query;

    // Parse star rating filter
    const starRatingFilter = starRating ? starRating.split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s) && s >= 1 && s <= 5) : [];

    // Parse facilities filter
    const facilitiesFilter = facilities ? facilities.split(',').map(f => f.trim()).filter(Boolean) : [];

    // Parse meal plan filter
    const mealPlanFilter = mealPlan ? mealPlan.split(',').map(m => m.trim()).filter(Boolean) : [];

    // Parse cancellation policy filter
    const cancellationPolicyFilter = cancellationPolicy.trim() || '';

    // Parse guest rating filter (minimum score)
    const guestRatingFilter = guestRating ? parseFloat(guestRating) : 0;

    // Smart detection: If destination contains Arabic characters, use 'ar'
    let finalLanguage = language;
    if (destination && /[\u0600-\u06FF]/.test(destination)) {
      finalLanguage = 'ar';
    }

    if (!destination) {
      return errorResponse(res, 'Destination is required', 400);
    }

    // ARABIC HOTEL NAME RESOLUTION: If destination is Arabic text,
    // check if it matches a hotel's nameAr and resolve to the hotel's city
    let resolvedDestination = destination;
    if (/[\u0600-\u06FF]/.test(destination)) {
      try {
        const HotelContentLookup = require('../models/HotelContent');
        const arabicMatch = await HotelContentLookup.findOne(
          { nameAr: { $regex: destination.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
          { name: 1, city: 1, hid: 1 }
        ).maxTimeMS(500).lean();

        if (arabicMatch && arabicMatch.city) {
          console.log(`🌐 Arabic hotel name resolved: "${destination}" → city "${arabicMatch.city}" (hotel: ${arabicMatch.name}, hid: ${arabicMatch.hid})`);
          resolvedDestination = arabicMatch.city;
        } else {
          // Also try the translateQuery for city names
          const translation = translateQuery(destination);
          if (translation.isTranslated) {
            console.log(`🌐 Arabic destination translated: "${destination}" → "${translation.translatedQuery}"`);
            resolvedDestination = translation.translatedQuery;
          }
        }
      } catch (lookupErr) {
        console.log('   ⚠️ Arabic name lookup error (non-fatal):', lookupErr.message);
      }
    }

    // Parse pagination parameters first
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 20;

    // OPTIMIZATION: Base cache key WITHOUT filters — one API call serves ALL filter combinations
    // Filters are applied post-cache, so changing filters never triggers a new RateHawk API call
    const baseCacheKey = `v12_${resolvedDestination}_${checkin}_${checkout}_${adults}_${children}_${currency}`;

    // Helper: apply post-API filters to a list of hotels
    const applyPostFilters = (hotels) => {
      const needsFilter = starRatingFilter.length > 0 || mealPlanFilter.length > 0 ||
                          cancellationPolicyFilter || guestRatingFilter > 0 || facilitiesFilter.length > 0;
      if (!needsFilter) return hotels;

      return hotels.filter(hotel => {
        if (starRatingFilter.length > 0) {
          const sr = hotel.star_rating || hotel.starRating || 0;
          if (!starRatingFilter.includes(sr)) return false;
        }
        if (guestRatingFilter > 0) {
          const rs = hotel.review_score || hotel.reviewScore || hotel.rating || 0;
          if (rs < guestRatingFilter) return false;
        }
        if (cancellationPolicyFilter === 'free_cancellation') {
          if (hotel.free_cancellation !== true) return false;
        } else if (cancellationPolicyFilter === 'non_refundable') {
          if (hotel.free_cancellation === true) return false;
        }
        if (mealPlanFilter.length > 0) {
          const avail = hotel.availableMeals || (hotel.meal ? [hotel.meal] : []);
          const match = mealPlanFilter.some(fm => avail.some(am => {
            const m = (am || '').toLowerCase();
            switch (fm) {
              case 'breakfast': return m === 'breakfast';
              case 'half_board': return m === 'halfboard' || m === 'half-board' || m === 'half_board';
              case 'full_board': return m === 'fullboard' || m === 'full-board' || m === 'full_board';
              case 'all_inclusive': return m === 'allinclusive' || m === 'all-inclusive' || m === 'all_inclusive';
              default: return m === fm;
            }
          }));
          if (!match) return false;
        }
        if (facilitiesFilter.length > 0) {
          const sf = (hotel.serp_filters || []).map(f => (f || '').toLowerCase());
          const am = (hotel.amenities || []).map(a => (a || '').toLowerCase());
          const ok = facilitiesFilter.every(fac => {
            switch (fac) {
              case 'free_breakfast': return ['breakfast','halfboard','fullboard','allinclusive'].includes((hotel.meal||'').toLowerCase());
              case 'free_cancellation': return hotel.free_cancellation === true;
              case 'no_prepayment': return hotel.no_prepayment === true;
              case 'free_wifi': return sf.includes('has_internet') || am.some(a => a.includes('wifi') || a.includes('internet'));
              case 'parking': return sf.includes('has_parking') || am.some(a => a.includes('parking'));
              case 'pool': return sf.includes('has_pool') || am.some(a => a.includes('pool'));
              case 'spa': return sf.includes('has_spa') || am.some(a => a.includes('spa'));
              case 'gym': return sf.includes('has_fitness') || am.some(a => a.includes('gym') || a.includes('fitness'));
              default: return true;
            }
          });
          if (!ok) return false;
        }
        return true;
      });
    };

    console.log(`📄 Page ${pageNumber}, Limit ${limitNumber} for: ${resolvedDestination}${resolvedDestination !== destination ? ` (from: ${destination})` : ''}`);

    // Check base cache first — apply filters & paginate from cache (instant)
    if (hotelSearchCache.has(baseCacheKey)) {
      console.log(`📦 Returning from cache for: ${destination} (page ${pageNumber})`);
      const cached = hotelSearchCache.get(baseCacheKey);

      // Apply filters from full cached results (fast — no API call)
      const filteredHotels = applyPostFilters(cached.hotels);
      const totalResults = filteredHotels.length;
      const totalPages = Math.ceil(totalResults / limitNumber);

      // Paginate filtered results
      const startIndex = (pageNumber - 1) * limitNumber;
      const endIndex = startIndex + limitNumber;
      const paginatedHotels = filteredHotels.slice(startIndex, endIndex);
      const hasMore = endIndex < filteredHotels.length;

      return successResponse(res, {
        hotels: paginatedHotels,
        total: totalResults,
        page: pageNumber,
        limit: limitNumber,
        totalPages: totalPages,
        hasMore: hasMore,
        fromCache: true,
        hotelsWithRates: totalResults
      }, `Hotels retrieved from cache (page ${pageNumber}/${totalPages})`);
    }

    // Use default dates if not provided (today, 1 night - same as homepage)
    let searchDates;
    if (checkin && checkout) {
      searchDates = { checkin, checkout };
    } else {
      searchDates = rateHawkService.constructor.getDefaultDates(0, 1);
    }

    // Special handling for ETG Test Hotel (for RateHawk certification)
    const isTestHotelSearch = destination.toLowerCase().includes('test hotel') ||
                              destination.toLowerCase().includes('test_hotel_do_not_book') ||
                              destination === '8473727';

    if (isTestHotelSearch) {
      console.log('🧪 Searching for ETG Test Hotel (hid=8473727) - Certification Mode');

      // ALWAYS use dates 30 days from now for test hotel (required for refundable rates to work)
      // This ensures the free_cancellation_before is well in the future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const checkoutDate = new Date(futureDate);
      checkoutDate.setDate(checkoutDate.getDate() + 2);
      const testSearchDates = {
        checkin: futureDate.toISOString().split('T')[0],
        checkout: checkoutDate.toISOString().split('T')[0]
      };

      console.log(`   🗓️ Using FIXED dates for certification: ${testSearchDates.checkin} to ${testSearchDates.checkout}`);

      try {
        // Search directly using HP API for the test hotel
        const testHotelResults = await rateHawkService.getHotelDetails(8473727, {
          checkin: testSearchDates.checkin,
          checkout: testSearchDates.checkout,
          adults: parseInt(adults) || 2,
          children: [],
          residency: 'gb',
          currency: 'USD'
        });

        if (testHotelResults) {
          const testHotel = {
            id: 'test_hotel_do_not_book',
            hid: 8473727,
            name: '🧪 ETG Test Hotel (For Certification)',
            address: 'Test Location - Use for RateHawk Certification',
            city: 'Test City',
            rating: 9.0,
            star_rating: 5,
            image: testHotelResults.images?.[0] || '/images/test-hotel.jpg',
            price: testHotelResults.rates?.[0]?.price || 0,
            pricePerNight: testHotelResults.rates?.[0]?.pricePerNight || 0,
            currency: 'USD',
            // Include fixed dates for certification
            checkIn: testSearchDates.checkin,
            checkOut: testSearchDates.checkout,
            isSearchedHotel: true,
            isTestHotel: true,
            rates: testHotelResults.rates || [],
            amenities: ['Free WiFi', 'Test Amenity', 'Certification Ready']
          };

          // Cache the test hotel result
          hotelSearchCache.set(cacheKey, { hotels: [testHotel] });

          return successResponse(res, {
            hotels: [testHotel],
            total: 1,
            page: 1,
            limit: 1,
            totalPages: 1,
            isTestHotel: true,
            message: 'ETG Test Hotel for RateHawk Certification. Book refundable rates only!'
          }, 'Test hotel found');
        }
      } catch (testHotelError) {
        console.error('❌ Error fetching test hotel:', testHotelError.message);
        // Continue to regular search if test hotel fetch fails
      }
    }

    // Step 1: Get region and hotel suggestions
    const suggestStart = Date.now();
    const suggestions = await rateHawkService.suggest(resolvedDestination, finalLanguage);
    console.log(`   ⏱️ Suggest took ${Date.now() - suggestStart}ms`);

    // Check if we found any regions OR hotels
    const hasRegions = suggestions.regions && suggestions.regions.length > 0;
    const hasHotels = suggestions.hotels && suggestions.hotels.length > 0;

    if (!hasRegions && !hasHotels) {
      return successResponse(res, {
        hotels: [],
        total: 0,
        page: 1,
        limit: parseInt(limit) || 20
      }, 'No hotels or regions found for the given destination');
    }

    // Step 2: Determine which region to search
    let regionToSearch;

    if (hasRegions) {
      // Prioritize regions: If a region matches (e.g., "Dubai"), treat it as a city search
      // This ensures we get the "unrated hotel" filter applied
      regionToSearch = suggestions.regions[0];
      console.log(`📍 Searching by region: ${suggestions.regions[0].name} (id: ${suggestions.regions[0].id})`);
    } else if (hasHotels) {
      // Only fallback to hotel search if NO region matched
      regionToSearch = suggestions.hotels[0];
      console.log(`🏨 Searching by hotel: ${suggestions.hotels[0].name} (region_id: ${suggestions.hotels[0].region_id})`);
    } else {
      // Should be covered by early return above, but safe fallback
      regionToSearch = suggestions.regions[0];
    }

    // Step 3: Search hotels in the selected region
    // Parse children ages - can be comma-separated string like "5,8,12" or empty
    let childrenAges = [];
    if (children && typeof children === 'string' && children.length > 0) {
      childrenAges = children.split(',').map(age => parseInt(age.trim())).filter(age => !isNaN(age) && age >= 0 && age <= 17);
    } else if (Array.isArray(children)) {
      childrenAges = children.map(age => parseInt(age)).filter(age => !isNaN(age));
    }

    const regionId = regionToSearch.region_id || regionToSearch.id;

    // NOTE: RateHawk SERP API returns ALL hotels with rates in a single call
    // There is NO pagination support (no offset/cursor), so we get everything at once
    // The API typically returns 100-500 hotels depending on city availability
    // We cache these results and paginate on our end for the frontend

    const searchApiStart = Date.now();
    const searchResults = await rateHawkService.searchByRegion(regionId, {
      ...searchDates,
      adults: parseInt(adults) || 2,
      children: childrenAges,
      currency,
      language: finalLanguage,
      // Local DB enrichment - no limit needed (DB has no rate limits)
      enrichmentLimit: 0, // 0 = enrich all hotels
      maxResults: 0, // 0 = no limit - return ALL hotels with rates from API
      // API-LEVEL FILTERS: Pass to RateHawk API for server-side filtering
      stars: starRatingFilter.length > 0 ? starRatingFilter : null,
      mealFilter: mealPlanFilter.length > 0 ? mealPlanFilter : null,
      facilitiesFilter: facilitiesFilter.length > 0 ? facilitiesFilter : null
    });
    console.log(`   ⏱️ searchByRegion took ${Date.now() - searchApiStart}ms (${searchResults.hotels?.length || 0} hotels)`);

    // Note: Star rating, meal, and facility filters are now applied at API level
    // See RateHawkService.searchByRegion for API-level filtering
    // Post-filtering only needed for filters not supported by RateHawk API
    const isCitySearch = hasRegions; // If we found/selected a region/city, it's a city search
    if (isCitySearch && searchResults.hotels) {
      console.log(`   ✅ API returned ${searchResults.hotels.length} hotels (filters applied at API level)`);
    }

    // Step 3.5: Merge API results with DB hotels
    const cityName = resolvedDestination;
    const cityNormalized = cityName.toLowerCase().trim();

    const HotelContent = require('../models/HotelContent');
    const CityStats = require('../models/CityStats');

    // For hotel-specific searches, skip slow DB count query (we'll use API results only)
    let totalHotelsInDB = 0;

    // Create a Set of HIDs from API results for quick lookup
    const apiHids = new Set(searchResults.hotels.map(h => h.hid).filter(Boolean));

    // Variables for parallel queries
    let dbOnlyHotels = [];
    const shouldMergeDbHotels = isCitySearch;

    if (isCitySearch) {
      console.log(`📊 Merging API results with HotelContent for city: ${cityName}`);

      // Check cached city count first (1 hour TTL)
      // Include star filter in cache key
      const starFilterSuffix = starRatingFilter.length > 0 ? `_stars${starRatingFilter.sort().join('')}` : '';
      const countCacheKey = `count_rated_${cityNormalized}${starFilterSuffix}`;

      const cachedCount = cityCountCache.get(countCacheKey);
      if (cachedCount && Date.now() - cachedCount.timestamp < CITY_COUNT_TTL) {
        totalHotelsInDB = cachedCount.count;
        console.log(`   📦 Total ${totalHotelsInDB} rated hotels from CityStats for "${cityName}" (cached)`);
      } else {
        // OPTIMIZATION: Use CityStats for O(1) lookup instead of countDocuments
        try {
          totalHotelsInDB = await CityStats.getCount(cityNormalized, starRatingFilter);
          console.log(`   ⚡ Total ${totalHotelsInDB} rated hotels from CityStats for "${cityName}" (instant lookup)`);
        } catch (statsErr) {
          // Fallback to countDocuments if CityStats not yet populated
          console.log(`   ⚠️ CityStats fallback: ${statsErr.message}`);
          const countQuery = {
            cityNormalized: cityNormalized,
            starRating: starRatingFilter.length > 0 ? { $in: starRatingFilter } : { $gt: 0 }
          };
          totalHotelsInDB = await HotelContent.countDocuments(countQuery);
          console.log(`   📦 Total ${totalHotelsInDB} rated hotels from countDocuments for "${cityName}" (fallback)`);
        }
        cityCountCache.set(countCacheKey, { count: totalHotelsInDB, timestamp: Date.now() });
      }
    } else {
      console.log(`📊 Hotel-specific search: "${cityName}" - skipping DB count for speed`);
    }

    console.log(`   🌐 Found ${searchResults.hotels.length} hotels with rates from API`);

    // For large cities (>1000 hotels), use API results only to avoid slow DB queries
    // Users typically only browse first few pages anyway
    const isLargeCity = totalHotelsInDB > 1000;
    if (isLargeCity) {
      console.log(`   ⚡ Large city detected (${totalHotelsInDB} hotels) - Using API results only for speed`);
    }

    // Skip DB merge for city searches - only show hotels with available rates
    // This makes search faster and provides better UX (no "Check availability" dead-ends)
    // Hotel-specific searches will still show the hotel from DB if needed (handled later)
    const shouldFetchDbHotels = false;

    if (shouldFetchDbHotels) {
      // Fetch DB-only hotels (those without rates from API) to add to the pool
      // We'll paginate the combined results later
      const maxDbHotels = 100; // Reduced to match API batch size (100 hotels)

      // OPTIMIZATION: Build DB query using cityNormalized (no regex needed)
      const dbQuery = {
        cityNormalized: cityNormalized,  // Direct index lookup instead of regex
        hid: { $nin: Array.from(apiHids) } // Exclude hotels already in API results
      };

      // For city searches, only fetch rated hotels from DB
      if (starRatingFilter.length > 0) {
        dbQuery.starRating = { $in: starRatingFilter };
        console.log(`   ⭐ Filtering DB by star rating: ${starRatingFilter.join(', ')}`);
      } else {
        dbQuery.starRating = { $gt: 0 }; // Only rated hotels
      }

      // OPTIMIZATION: Use projection to fetch only needed fields (reduces data transfer by ~50%)
      const localHotels = await HotelContent.find(dbQuery)
        .select('hotelId hid name address city country starRating mainImage images latitude longitude')
        .limit(maxDbHotels)
        .lean();

      // Map local hotels to the expected format
      for (const hotel of localHotels) {
        if (apiHids.has(hotel.hid)) continue; // Skip if already in API results

        const imageUrl = (hotel.images?.[0]?.url || hotel.mainImage)?.replace('{size}', '640x400');
        dbOnlyHotels.push({
          id: hotel.hotelId || `hid_${hotel.hid}`,
          hid: hotel.hid,
          hotelId: hotel.hotelId,
          name: hotel.name,
          address: hotel.address,
          city: hotel.city,
          country: hotel.country,
          image: imageUrl,
          images: hotel.images?.slice(0, 5).map(img => (img.url || img)?.replace('{size}', '640x400')).filter(Boolean) || [],
          star_rating: hotel.starRating,
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          isEnriched: true,
          price: null,  // No price available from API
          noRatesAvailable: true,  // Flag for frontend to show "Check availability"
          currency: currency
        });
      }
    } // Close if (shouldFetchDbHotels) block

    if (dbOnlyHotels.length > 0) {
      console.log(`   ➕ Adding ${dbOnlyHotels.length} additional hotels from DB`);
    } else if (isLargeCity) {
      console.log(`   ⚡ Skipped DB merge for performance (large city)`);
    } else if (!isCitySearch) {
      console.log(`   ⚡ Skipped DB merge for hotel-specific search`);
    }

    // Merge: API hotels first (with rates), then DB-only hotels (without rates)
    let allHotels = [...searchResults.hotels, ...dbOnlyHotels];

    console.log(`   ✅ Total combined: ${allHotels.length} hotels (DB has ${totalHotelsInDB} total)`);

    // POST-API FILTERING moved to applyPostFilters() helper — applied at cache read AND final pagination
    // No inline filtering needed here; allHotels stays unfiltered for caching
    console.log(`   ✅ ${allHotels.length} hotels ready (filters applied at pagination time)`);
    // If searching for a SPECIFIC HOTEL (not a city/region), prioritize it but show other hotels too
    // IMPORTANT: Only do this for hotel-specific searches, NOT city searches
    // Otherwise city searches would incorrectly highlight random hotels
    if (hasHotels && !isCitySearch && allHotels.length > 0) {
      const searchedHotelId = suggestions.hotels[0].id;
      const searchedHotelHid = suggestions.hotels[0].hid;
      const searchedHotelName = suggestions.hotels[0].name || suggestions.hotels[0].label || '';

      console.log(`🔍 Looking for searched hotel: id=${searchedHotelId}, hid=${searchedHotelHid}, name=${searchedHotelName}`);

      // IMPORTANT: Clear all isSearchedHotel flags first to ensure only ONE hotel is highlighted
      allHotels.forEach(h => { h.isSearchedHotel = false; });

      // Find the searched hotel using EXACT matching only (by hid or id, NOT by name)
      let matchedHotelIndex = allHotels.findIndex(hotel => {
        // Match by hid (most reliable)
        if (searchedHotelHid && hotel.hid === searchedHotelHid) return true;
        // Match by id
        if (searchedHotelId && hotel.id === searchedHotelId) return true;
        // Match by hotelId (original ID from RateHawk)
        if (searchedHotelId && hotel.hotelId === searchedHotelId) return true;
        return false;
      });

      // If no exact ID match, try EXACT name matching only (not partial matching)
      if (matchedHotelIndex === -1 && searchedHotelName) {
        const normalizedSearchName = searchedHotelName.toLowerCase().trim();
        matchedHotelIndex = allHotels.findIndex(hotel => {
          const hotelName = (hotel.name || '').toLowerCase().trim();
          // Only exact name match - no partial matching to avoid multiple matches
          return hotelName === normalizedSearchName;
        });
        if (matchedHotelIndex !== -1) {
          console.log(`🔍 Found hotel by exact name match: "${allHotels[matchedHotelIndex].name}"`);
        }
      }

      if (matchedHotelIndex !== -1) {
        const matchedHotel = allHotels[matchedHotelIndex];

        // If the matched hotel doesn't have location data, enrich it from Local DB (not Content API)
        if (!matchedHotel.address || !matchedHotel.city) {
          console.log(`⚠️ Searched hotel missing location data, enriching from Local DB...`);
          try {
            const HotelContent = require('../models/HotelContent');
            const localHotel = await HotelContent.findOne({ hid: matchedHotel.hid }).lean();

            if (localHotel) {
              matchedHotel.address = localHotel.address || '';
              matchedHotel.city = localHotel.city || '';
              matchedHotel.country = localHotel.country || 'Saudi Arabia';
              // Also enrich image from DB if missing
              if (!matchedHotel.image && localHotel.images?.length > 0) {
                const imgUrl = localHotel.images[0]?.url || localHotel.images[0];
                matchedHotel.image = imgUrl?.replace('{size}', '640x400');
              }
              console.log(`✅ Enriched searched hotel from Local DB: ${matchedHotel.address}, ${matchedHotel.city}`);
            }
          } catch (err) {
            console.error('Error enriching searched hotel from Local DB:', err.message);
          }
        }

        // Mark ONLY this hotel as the searched hotel for frontend prioritization
        matchedHotel.isSearchedHotel = true;

        // Move the searched hotel to the front of the array
        allHotels.splice(matchedHotelIndex, 1);
        allHotels.unshift(matchedHotel);
        console.log(`✅ Found exact match for searched hotel: ${matchedHotel.name} (showing it first with ${allHotels.length - 1} other hotels)`);
      } else {
        console.log(`⚠️ Searched hotel "${searchedHotelName}" not found in results with rates, will try to fetch from Local DB and add it to the top`);
        // Don't clear the array - we'll add the searched hotel from Local DB to the front
      }
    }


    // If searching for a specific hotel and it's not found in results, fetch hotel details from Local DB
    // IMPORTANT: Only do this for hotel-specific searches, NOT city searches
    if (hasHotels && !isCitySearch && suggestions.hotels[0].hid) {
      const searchedHotelId = suggestions.hotels[0].id;
      const searchedHotelHid = suggestions.hotels[0].hid;

      // Check if the searched hotel is in the results
      const hotelFoundInResults = allHotels.some(hotel =>
        hotel.id === searchedHotelId || hotel.hid === searchedHotelHid
      );

      if (!hotelFoundInResults) {
        console.log(`⚠️ Searched hotel not in results, checking Local DB...`);
        try {
          // Use Local DB instead of API (ETG Requirement #3: No live content parsing)
          const HotelContent = require('../models/HotelContent');
          const localHotel = await HotelContent.findOne({ hid: searchedHotelHid }).lean();

          if (localHotel) {
             console.log(`✅ Found searched hotel in Local DB: ${localHotel.name}`);

             // Map Local DB content to API format structure
             const imageUrl = (localHotel.images?.[0]?.url || localHotel.mainImage)?.replace('{size}', '1024x768');

             // Extract amenities list
             const amenities = [];
             if (localHotel.amenityGroups) {
                localHotel.amenityGroups.forEach(g => {
                    if (g.amenities) amenities.push(...g.amenities);
                });
             }

             // Create hotel object from local data
             const enrichedHotel = {
               id: localHotel.hotelId || `hid_${localHotel.hid}`,
               hid: localHotel.hid,
               hotelId: localHotel.hotelId,
               name: localHotel.name,
               address: localHotel.address,
               city: localHotel.city,
               country: localHotel.country,
               image: imageUrl,
               images: localHotel.images?.map(img => img.url?.replace('{size}', '1024x768')).filter(Boolean) || [],
               star_rating: localHotel.starRating,
               latitude: localHotel.latitude,
               longitude: localHotel.longitude,
               amenities: amenities,
               facilities: amenities,
               isEnriched: true,
               price: null, // No price available from API
               noRatesAvailable: true, // Flag for frontend to show "No rooms available"
               currency: currency,
               isSearchedHotel: true // Mark as searched hotel for frontend prioritization
             };

             // Add to top of results
             allHotels.unshift(enrichedHotel);
             console.log(`✅ Added ${localHotel.name} to top of results from Local DB`);

          } else {
             console.log(`❌ Searched hotel (HID: ${searchedHotelHid}) not found in Local DB either.`);
             // STRICT COMPLIANCE: Do NOT call API as fallback.
             // "We do not allow parsing the hotel static content during the search"
             // If it's missing from DB, it's missing from search. period.
          }
        } catch (error) {
          console.error('❌ Error checking local DB for searched hotel:', error.message);
        }
      }
    }

    // Cache ALL unfiltered results IMMEDIATELY (TripAdvisor added in background)
    hotelSearchCache.set(baseCacheKey, {
      hotels: allHotels,
      total: allHotels.length,
      timestamp: Date.now(),
      region: regionToSearch
    });

    // Auto-clear cache after 10 minutes
    setTimeout(() => {
      hotelSearchCache.delete(baseCacheKey);
    }, 10 * 60 * 1000);

    // Apply filters then paginate
    const filteredResults = applyPostFilters(allHotels);
    const startIndex = (pageNumber - 1) * limitNumber;
    const endIndex = startIndex + limitNumber;
    const paginatedHotels = filteredResults.slice(startIndex, endIndex);
    const totalHotelsWithRates = filteredResults.length;
    const finalTotalPages = Math.ceil(totalHotelsWithRates / limitNumber);
    const hasMoreHotels = endIndex < filteredResults.length;

    const totalSearchTime = Date.now() - searchStartTime;
    console.log(`   📄 Returning page ${pageNumber}/${finalTotalPages}: ${paginatedHotels.length} of ${totalHotelsWithRates} hotels (${allHotels.length} total cached)`);
    console.log(`   ⏱️ TOTAL search time: ${totalSearchTime}ms`);

    // Set Cache-Control for browser caching of search results (30 seconds)
    res.set('Cache-Control', 'private, max-age=30');

    successResponse(res, {
      hotels: paginatedHotels,
      total: totalHotelsWithRates,
      page: pageNumber,
      limit: limitNumber,
      totalPages: finalTotalPages,
      hasMore: hasMoreHotels,
      hotelsWithRates: totalHotelsWithRates,
      region: regionToSearch.name || regionToSearch.region_name || 'Unknown',
      searchedHotel: hasHotels ? suggestions.hotels[0].name : null
    }, `Page ${pageNumber}/${finalTotalPages} - Showing ${paginatedHotels.length} of ${totalHotelsWithRates} hotels`);

    // BACKGROUND: TripAdvisor enrichment (non-blocking, updates cache in-place)
    setImmediate(async () => {
      const taStart = Date.now();
      const hotelsWithoutTA = [];
      try {
        const TripAdvisorHotel = require('../models/TripAdvisorHotel');
        const searchCity = destination || 'Saudi Arabia';

        // Step 1: Batch exact match
        const allNames = allHotels.map(h => h.name).filter(Boolean);
        if (allNames.length > 0) {
          const taResults = await TripAdvisorHotel.findByNamesAndCity(allNames, searchCity);
          const taMap = {};
          taResults.forEach(ta => {
            taMap[ta.name_normalized] = ta;
            if (ta.search_names) {
              ta.search_names.forEach(alias => { taMap[alias] = ta; });
            }
            if (ta.name) {
              taMap[ta.name.toLowerCase().trim()] = ta;
            }
          });

          allHotels.forEach(h => {
            if (!h.name) return;
            const nameNorm = h.name.toLowerCase().trim();
            const ta = taMap[nameNorm];
            if (ta && ta.rating) {
              h.tripadvisor_rating = ta.rating;
              h.tripadvisor_num_reviews = ta.num_reviews;
              h.tripadvisor_location_id = ta.location_id;
            }
          });
        }

        // Step 2: Individual fuzzy match for unmatched hotels (DB only)
        const unmatchedHotels = allHotels.filter(h => h.name && !h.tripadvisor_rating);
        if (unmatchedHotels.length > 0 && unmatchedHotels.length <= 100) {
          const fuzzyPromises = unmatchedHotels.map(async (h) => {
            try {
              const found = await TripAdvisorHotel.findByNameAndCity(h.name, searchCity);
              if (found && found.rating) {
                h.tripadvisor_rating = found.rating;
                h.tripadvisor_num_reviews = found.num_reviews;
                h.tripadvisor_location_id = found.location_id;
                TripAdvisorHotel.updateOne(
                  { _id: found._id },
                  { $addToSet: { search_names: h.name.toLowerCase().trim() } }
                ).catch(() => {});
              } else {
                hotelsWithoutTA.push(h.name);
              }
            } catch (e) {
              hotelsWithoutTA.push(h.name);
            }
          });
          await Promise.all(fuzzyPromises);
        } else if (unmatchedHotels.length > 100) {
          unmatchedHotels.forEach(h => hotelsWithoutTA.push(h.name));
        }

        const enrichedCount = allHotels.filter(h => h.tripadvisor_rating).length;
        console.log(`   🏷️ [BG] TripAdvisor enriched ${enrichedCount}/${allHotels.length} hotels (${Date.now() - taStart}ms)`);
      } catch (taError) {
        console.error('   ⚠️ [BG] TripAdvisor enrichment error:', taError.message);
      }

      // Step 3: Background fetch from TripAdvisor API for hotels not in DB
      if (hotelsWithoutTA.length > 0) {
        const bgCity = destination || 'Saudi Arabia';
        const toFetch = hotelsWithoutTA.slice(0, 20);
        try {
          await tripadvisorService.getHotelRatings(toFetch, bgCity);
          console.log(`   ✅ [BG] TripAdvisor API fetch done for ${toFetch.length} hotels`);
        } catch (bgErr) {
          console.error(`   ⚠️ [BG] TripAdvisor API error: ${bgErr.message}`);
        }
      }
    });

  } catch (error) {
    console.error('Hotel search error:', error);
    errorResponse(res, 'Failed to search hotels', 500);
  }
});

/**
 * Get hotel details by HID (RateHawk Hotel ID)
 * GET /api/hotels/details/:hid?checkin=2025-01-15&checkout=2025-01-18&adults=2
 */
router.get('/details/:hid', async (req, res) => {
  try {
    const startTime = Date.now();
    console.log('\n' + '═'.repeat(60));
    console.log('🏨 HOTEL DETAILS REQUEST');
    console.log('═'.repeat(60));
    const { hid } = req.params;
    const {
      checkin,
      checkout,
      adults = 2,
      children = 0,
      match_hash,
      currency = 'USD',
      language = 'en'
    } = req.query;
    console.log(`   HID: ${hid}, dates: ${checkin}→${checkout}, currency: ${currency}, lang: ${language}`);

    // Validate hid - support both numeric hid and string hotelId formats
    let hotelId = parseInt(hid);

    // If not a valid number, try to look up by string hotelId in the database
    if (!hotelId || isNaN(hotelId)) {
      const HotelContent = require('../models/HotelContent');
      const localHotel = await HotelContent.findOne({ hotelId: hid }).lean();

      if (localHotel && localHotel.hid) {
        hotelId = localHotel.hid;
        console.log(`📍 Resolved string hotelId "${hid}" to numeric hid: ${hotelId}`);
      } else {
        console.log(`❌ Could not resolve hotelId "${hid}" to numeric hid`);
        return errorResponse(res, 'Hotel not found', 404);
      }
    }

    // Special handling for ETG Test Hotel (hid=8473727) - for RateHawk certification
    const isTestHotel = hotelId === 8473727 || hid === 'test_hotel_do_not_book';

    // Use fixed dates 30 days from now for test hotel (required for refundable rates)
    let searchDates;
    if (isTestHotel) {
      console.log('🧪 Loading test hotel details - using FIXED dates for certification');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const checkoutDate = new Date(futureDate);
      checkoutDate.setDate(checkoutDate.getDate() + 2);
      searchDates = {
        checkin: futureDate.toISOString().split('T')[0],
        checkout: checkoutDate.toISOString().split('T')[0]
      };
      console.log(`   🗓️ Test hotel dates: ${searchDates.checkin} to ${searchDates.checkout}`);
    } else if (checkin && checkout) {
      searchDates = { checkin, checkout };
    } else {
      searchDates = rateHawkService.constructor.getDefaultDates(0, 1);
    }

    // Parse children ages - can be comma-separated string like "5,8,12" or empty
    let childrenAges = [];
    if (children && typeof children === 'string' && children.length > 0) {
      childrenAges = children.split(',').map(age => parseInt(age.trim())).filter(age => !isNaN(age) && age >= 0 && age <= 17);
    } else if (Array.isArray(children)) {
      childrenAges = children.map(age => parseInt(age)).filter(age => !isNaN(age));
    }

    // Check static content cache (images, amenities, POI, reviews — NOT rates)
    const staticCacheStart = Date.now();
    const cachedStatic = getHotelStaticCache(hotelId);
    if (cachedStatic) {
      console.log(`   ⚡ Static cache HIT for HID ${hotelId} (skipping DB queries)`);
    } else {
      console.log(`   ❄️ Static cache MISS for HID ${hotelId}`);
    }
    console.log(`   ⏱️ Static cache check: ${Date.now() - staticCacheStart}ms`);

    let hotelDetails;
    // Start POI + Arabic name fetch IN PARALLEL with the API call (saves ~400ms)
    // These only need hotelId which we already have
    let poiPromise, arPromise;
    if (cachedStatic) {
      poiPromise = Promise.resolve(cachedStatic.poiData);
      arPromise = Promise.resolve(cachedStatic.arContent);
      console.log(`   ⚡ POI+Arabic will come from static cache`);
    } else {
      const HotelPOI = require('../models/HotelPOI');
      const HotelContentAr = require('../models/HotelContent');
      poiPromise = HotelPOI.getGroupedPOI(hotelId).catch(err => { console.error('POI error:', err.message); return null; });
      arPromise = HotelContentAr.findOne(
        { hid: hotelId, nameAr: { $exists: true, $ne: null, $ne: '' } },
        { nameAr: 1 }
      ).lean().catch(() => null);
      console.log(`   🚀 POI+Arabic fetch started in parallel with API`);
    }
    try {
      // Debug log for currency tracing
      console.log(`   💷 Currency: ${currency}, Language: ${language}`);

      // Try to get hotel details with rates (rates are ALWAYS fetched fresh)
      const apiStart = Date.now();
      hotelDetails = await rateHawkService.getHotelDetails(hotelId, {
        ...searchDates,
        adults: parseInt(adults) || 2,
        children: childrenAges,
        match_hash,
        currency,
        language,
        // Pass cached raw DB documents to skip DB queries
        _cachedStaticContent: cachedStatic?.rawContent || null,
        _cachedReviewData: cachedStatic?.reviewData || null
      });
      console.log(`   ⏱️ getHotelDetails (API+DB+reviews) took ${Date.now() - apiStart}ms`);
    } catch (error) {
      // If hotel not found (no rates), fetch from Local DB first (not Content API)
      console.log(`⚠️ Hotel ${hotelId} not found with rates, fetching from Local DB...`);

      try {
        const HotelContent = require('../models/HotelContent');
        const localHotel = await HotelContent.findOne({ hid: hotelId }).lean();

        if (!localHotel) {
          console.log(`❌ Hotel ${hotelId} not found in Local DB either`);
          return errorResponse(res, 'Hotel not found', 404);
        }

        console.log(`✅ Found hotel in Local DB: ${localHotel.name}`);

        // Process images from Local DB
        let hotelImages = [];
        console.log(`📷 Processing images for hotel ${localHotel.name} from Local DB...`);

        if (localHotel.images && localHotel.images.length > 0) {
          hotelImages = localHotel.images.map(img => {
            const imgUrl = typeof img === 'string' ? img : img.url;
            return imgUrl?.replace('{size}', '1024x768');
          }).filter(Boolean);
          console.log(`   - Processed ${hotelImages.length} images from Local DB`);
        } else if (localHotel.mainImage) {
          hotelImages = [localHotel.mainImage.replace('{size}', '1024x768')];
          console.log(`   - Using mainImage from Local DB`);
        }

        if (hotelImages.length === 0) {
          console.log(`   ⚠️ No images found for hotel in Local DB`);
        }

        // Extract amenities from Local DB structure
        const amenities = [];
        if (localHotel.amenityGroups) {
          localHotel.amenityGroups.forEach(group => {
            if (group.amenities) {
              group.amenities.forEach(amenity => {
                const amenityName = typeof amenity === 'string' ? amenity : amenity.name;
                if (amenityName) {
                  amenities.push(amenityName);
                }
              });
            }
          });
        }

        // Build description from Local DB structure
        let description = '';
        if (localHotel.descriptionStruct) {
          description = localHotel.descriptionStruct.map(d => d.paragraphs?.join(' ')).join('\n\n') || '';
        } else if (localHotel.description) {
          description = localHotel.description;
        }

        // Format hotel data from Local DB
        hotelDetails = {
          id: localHotel.hotelId || `hid_${localHotel.hid}`,
          hid: localHotel.hid,
          name: localHotel.name,
          nameAr: localHotel.nameAr || null,
          address: localHotel.address || '',
          city: localHotel.city || '',
          country: localHotel.country || '',
          star_rating: localHotel.starRating || 0,
          images: hotelImages,
          mainImage: hotelImages[0] || null,
          amenities: amenities,
          description: description,
          coordinates: { latitude: localHotel.latitude || 0, longitude: localHotel.longitude || 0 },
          facts: localHotel.facts || [],
          check_in_time: localHotel.checkInTime || null,
          check_out_time: localHotel.checkOutTime || null,
          metapolicy_extra_info: localHotel.metapolicyExtraInfo || null,
          metapolicy_struct: localHotel.metapolicyStruct || null,
          noRatesAvailable: true,
          message: 'No rates available for selected dates. Try different dates or contact us for availability.'
        };

        // Fetch review data with hybrid approach (DB first, API fallback)
        try {
          const reviewData = await rateHawkService.getOrFetchReviews(hotelId, 'en', 7);

          if (reviewData) {
            console.log(`⭐ Review data for HID ${hotelId}: Rating ${reviewData.overall_rating}, ${reviewData.review_count} reviews`);
            hotelDetails.rating = reviewData.overall_rating;
            hotelDetails.reviewScore = reviewData.overall_rating;
            hotelDetails.reviewCount = reviewData.review_count || 0;
            hotelDetails.detailed_ratings = reviewData.detailed_ratings;
            hotelDetails.reviews = (reviewData.reviews || []).slice(0, 10);
          } else {
            console.log(`⚠️ No review data found for HID: ${hotelId}`);
          }
        } catch (reviewError) {
          console.error('Error fetching review data:', reviewError.message);
        }

        console.log(`✅ Hotel fetched from Local DB: ${hotelDetails.name}`);
      } catch (dbError) {
        console.error('Error fetching from Local DB:', dbError.message);
        return errorResponse(res, 'Hotel not found', 404);
      }
    }

    // Use cached static data if available, otherwise fetch POI + Arabic name from DB
    const poiStart = Date.now();
    const [poiData, arContent] = await Promise.all([poiPromise, arPromise]);
    if (!cachedStatic) {
      console.log(`   ⏱️ POI + Arabic name: ${Date.now() - poiStart}ms (ran in parallel — actual wait only for remaining time)`);
    }

    // Format response to match frontend expectations
    const formattedHotel = {
      id: hotelDetails.id,
      hid: hotelDetails.hid,
      name: hotelDetails.name,
      nameAr: hotelDetails.nameAr || null,
      description: hotelDetails.description,
      address: hotelDetails.address,
      city: hotelDetails.city,
      country: hotelDetails.country,
      coordinates: hotelDetails.coordinates,
      images: hotelDetails.images,
      mainImage: hotelDetails.mainImage,
      star_rating: hotelDetails.star_rating,
      // Review data from hotel_reviews - DO NOT fallback to star_rating
      rating: hotelDetails.rating || hotelDetails.reviewScore || null,
      reviewScore: hotelDetails.reviewScore || hotelDetails.rating || null,
      reviewCount: hotelDetails.reviewCount || 0,
      detailed_ratings: hotelDetails.detailed_ratings || null,
      reviews: hotelDetails.reviews || [],
      amenities: hotelDetails.amenities,
      facts: hotelDetails.facts,
      rates: hotelDetails.rates,
      check_in_time: hotelDetails.check_in_time,
      check_out_time: hotelDetails.check_out_time,
      metapolicy_extra_info: hotelDetails.metapolicy_extra_info,
      metapolicy_struct: hotelDetails.metapolicy_struct,
      poi_data: poiData
    };

    // Apply Arabic name if found (fetched in parallel above)
    if (arContent && arContent.nameAr) {
      formattedHotel.nameAr = arContent.nameAr;
    }

    // Cache ONLY the raw DB documents (not rates) for future requests
    // This lets us skip DB queries but always process fresh rates
    if (!cachedStatic) {
      setHotelStaticCache(hotelId, {
        rawContent: hotelDetails._rawStaticContent || null,  // Raw HotelContent doc
        reviewData: hotelDetails._rawReviewData || null,     // Raw review data
        poiData: poiData,
        arContent: arContent
      });
    }

    // Short cache for browser — prices are fresh but avoid hammering during same session
    res.set('Cache-Control', 'private, max-age=30');

    const totalTime = Date.now() - startTime;
    console.log('─'.repeat(60));
    console.log(`   ✅ TOTAL hotel details for HID ${hid}: ${totalTime}ms`);
    console.log('═'.repeat(60) + '\n');
    successResponse(res, { hotel: formattedHotel }, 'Hotel details retrieved successfully');

  } catch (error) {
    console.error('Hotel details error:', error);

    if (error.message === 'Hotel not found') {
      return errorResponse(res, 'Hotel not found', 404);
    }

    errorResponse(res, 'Failed to get hotel details', 500);
  }
});

/**
 * Legacy endpoint compatibility - redirect to new search
 * This maintains backward compatibility with existing frontend code
 */
router.get('/search-legacy', async (req, res) => {
  // Redirect to new search endpoint
  req.url = '/search';
  return router.handle(req, res);
});

/**
 * Clear hotel search cache (for development/testing)
 * POST /api/hotels/clear-cache
 */
router.post('/clear-cache', (req, res) => {
  const cacheSize = hotelSearchCache.size;
  const countCacheSize = cityCountCache.size;
  const staticCacheSize = hotelStaticCache.size;

  hotelSearchCache.clear();
  cityCountCache.clear();
  hotelStaticCache.clear();

  successResponse(res, {
    cleared: true,
    searchCacheCleared: cacheSize,
    countCacheCleared: countCacheSize,
    staticCacheCleared: staticCacheSize
  }, `Cleared ${cacheSize} search, ${countCacheSize} count, ${staticCacheSize} static cache entries`);
});

/**
 * Clear hotel search cache (exported for use by margin rules)
 * Call this when margin rules are updated to ensure fresh prices
 */
function clearHotelSearchCache() {
  const cacheSize = hotelSearchCache.size;
  const countCacheSize = cityCountCache.size;
  const detailsCacheSize = hotelDetailsCache.size;
  hotelSearchCache.clear();
  cityCountCache.clear();
  hotelDetailsCache.clear();
  console.log(`🗑️  Cleared hotel caches: ${cacheSize} search, ${countCacheSize} count, ${detailsCacheSize} details`);
  return { searchCacheCleared: cacheSize, countCacheCleared: countCacheSize, detailsCacheCleared: detailsCacheSize };
}

module.exports = router;
module.exports.clearHotelSearchCache = clearHotelSearchCache;
