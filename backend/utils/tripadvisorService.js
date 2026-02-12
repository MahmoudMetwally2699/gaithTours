const axios = require('axios');
const TripAdvisorHotel = require('../models/TripAdvisorHotel');

const TRIPADVISOR_API_BASE = 'https://api.content.tripadvisor.com/api/v1';
const API_KEY = process.env.TRIPADVISOR_API_KEY;

/**
 * TripAdvisor Content API Service
 *
 * Fetches hotel ratings and reviews from TripAdvisor.
 * Data is permanently stored in MongoDB after first fetch.
 * If a hotel is already in DB, it's served from DB — no API call.
 */
class TripAdvisorService {

  /**
   * Search TripAdvisor for a location (hotel) by name
   * Uses Location Search endpoint
   * @param {string} query - Hotel name + city (e.g., "Hilton Cairo")
   * @param {string} category - Category filter (default: "hotels")
   * @returns {Array} Array of matching locations
   */
  async searchLocation(query, category = 'hotels') {
    try {
      if (!API_KEY) {
        console.error('❌ TRIPADVISOR_API_KEY is not set');
        return [];
      }

      console.log(`🔍 TripAdvisor Search: "${query}" (category: ${category})`);

      const response = await axios.get(`${TRIPADVISOR_API_BASE}/location/search`, {
        params: {
          key: API_KEY,
          searchQuery: query,
          category: category,
          language: 'en'
        },
        timeout: 10000
      });

      const results = response.data?.data || [];
      console.log(`   ✅ Found ${results.length} results`);
      return results;

    } catch (error) {
      console.error(`❌ TripAdvisor Search error: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}, Data:`, error.response.data);
      }
      return [];
    }
  }

  /**
   * Get location details from TripAdvisor
   * Returns rating, review count, ranking, price level, etc.
   * @param {string} locationId - TripAdvisor location ID
   * @returns {Object|null} Location details or null
   */
  async getLocationDetails(locationId) {
    try {
      if (!API_KEY) return null;

      console.log(`📋 TripAdvisor Details: locationId=${locationId}`);

      const response = await axios.get(`${TRIPADVISOR_API_BASE}/location/${locationId}/details`, {
        params: {
          key: API_KEY,
          language: 'en',
          currency: 'USD'
        },
        timeout: 10000
      });

      return response.data || null;

    } catch (error) {
      console.error(`❌ TripAdvisor Details error for ${locationId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get reviews for a location from TripAdvisor
   * Returns up to 5 most recent reviews
   * @param {string} locationId - TripAdvisor location ID
   * @param {string} language - Language code (default: 'en')
   * @returns {Array} Array of reviews
   */
  async getLocationReviews(locationId, language = 'en') {
    try {
      if (!API_KEY) return [];

      console.log(`💬 TripAdvisor Reviews: locationId=${locationId}, lang=${language}`);

      const response = await axios.get(`${TRIPADVISOR_API_BASE}/location/${locationId}/reviews`, {
        params: {
          key: API_KEY,
          language: language
        },
        timeout: 10000
      });

      const reviews = response.data?.data || [];
      console.log(`   ✅ Got ${reviews.length} reviews`);
      return reviews;

    } catch (error) {
      console.error(`❌ TripAdvisor Reviews error for ${locationId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Main method: Get TripAdvisor ratings for a list of hotels in a city
   *
   * Flow:
   * 1. Check DB for existing data
   * 2. For hotels NOT in DB → search TripAdvisor → get details → get reviews → save to DB
   * 3. Return all ratings (from DB + freshly fetched)
   *
   * @param {Array<string>} hotelNames - Array of hotel names
   * @param {string} city - City name
   * @returns {Object} Map of hotel_name → { rating, num_reviews, location_id, web_url, ... }
   */
  async getHotelRatings(hotelNames, city) {
    const results = {};
    const cityNorm = city.toLowerCase().trim();

    if (!hotelNames || hotelNames.length === 0) return results;

    console.log(`\n🏨 TripAdvisor: Getting ratings for ${hotelNames.length} hotels in "${city}"`);

    // Step 1: Check DB for existing data
    const existingHotels = await TripAdvisorHotel.findByNamesAndCity(hotelNames, city);
    const existingMap = {};
    existingHotels.forEach(h => {
      existingMap[h.name_normalized] = h;
    });

    const hotelsToFetch = [];

    for (const name of hotelNames) {
      const nameNorm = name.toLowerCase().trim();
      if (existingMap[nameNorm]) {
        // Already in DB - use cached data
        const cached = existingMap[nameNorm];
        results[name] = {
          location_id: cached.location_id,
          name: cached.name,
          rating: cached.rating,
          num_reviews: cached.num_reviews,
          ranking: cached.ranking,
          price_level: cached.price_level,
          web_url: cached.web_url,
          rating_image_url: cached.rating_image_url,
          reviews: cached.reviews || [],
          from_cache: true
        };
        console.log(`   📦 Cache hit: "${name}" → rating ${cached.rating}/5, ${cached.num_reviews} reviews`);
      } else {
        hotelsToFetch.push(name);
      }
    }

    if (hotelsToFetch.length === 0) {
      console.log(`   ✅ All ${hotelNames.length} hotels served from DB`);
      return results;
    }

    // Step 1b: Try individual fuzzy match for hotels not found in batch
    const stillToFetch = [];
    for (const name of hotelsToFetch) {
      try {
        const found = await TripAdvisorHotel.findByNameAndCity(name, city);
        if (found) {
          results[name] = {
            location_id: found.location_id,
            name: found.name,
            rating: found.rating,
            num_reviews: found.num_reviews,
            ranking: found.ranking,
            price_level: found.price_level,
            web_url: found.web_url,
            rating_image_url: found.rating_image_url,
            reviews: found.reviews || [],
            from_cache: true
          };
          console.log(`   📦 Fuzzy match: "${name}" → "${found.name}" (rating ${found.rating}/5, ${found.num_reviews} reviews)`);
        } else {
          stillToFetch.push(name);
        }
      } catch (err) {
        stillToFetch.push(name);
      }
    }

    if (stillToFetch.length === 0) {
      console.log(`   ✅ All hotels resolved from DB (batch + fuzzy)`);
      return results;
    }

    console.log(`   🌐 Need to fetch ${stillToFetch.length} hotels from TripAdvisor API`);

    // Step 2: Fetch missing hotels from TripAdvisor (with rate limiting)
    for (const hotelName of stillToFetch) {
      try {
        // Search for the hotel
        const searchQuery = `${hotelName} ${city}`;
        const searchResults = await this.searchLocation(searchQuery, 'hotels');

        if (!searchResults || searchResults.length === 0) {
          console.log(`   ⚠️ No TripAdvisor result for "${hotelName}"`);
          continue;
        }

        // Take the best match (first result)
        const match = searchResults[0];
        const locationId = match.location_id;

        // Check if this location_id is already in DB (different hotel name, same location)
        const existingByLocationId = await TripAdvisorHotel.findOne({ location_id: locationId });
        if (existingByLocationId) {
          results[hotelName] = {
            location_id: existingByLocationId.location_id,
            name: existingByLocationId.name,
            rating: existingByLocationId.rating,
            num_reviews: existingByLocationId.num_reviews,
            ranking: existingByLocationId.ranking,
            price_level: existingByLocationId.price_level,
            web_url: existingByLocationId.web_url,
            rating_image_url: existingByLocationId.rating_image_url,
            reviews: existingByLocationId.reviews || [],
            from_cache: true
          };
          console.log(`   📦 Location ID already in DB: "${hotelName}" → ${locationId}`);
          continue;
        }

        // Get full details
        const details = await this.getLocationDetails(locationId);

        // Get reviews (Arabic)
        const reviews = await this.getLocationReviews(locationId, 'ar');

        // Save to DB
        const hotelData = {
          location_id: locationId,
          name: match.name || hotelName,
          name_normalized: hotelName.toLowerCase().trim(),
          city: city,
          city_normalized: cityNorm,
          rating: details?.rating ? parseFloat(details.rating) : null,
          rating_image_url: details?.rating_image_url || null,
          num_reviews: details?.num_reviews || '0',
          ranking: details?.ranking_data?.ranking_string || details?.ranking || null,
          price_level: details?.price_level || null,
          web_url: details?.web_url || null,
          address: details?.address_obj || null,
          latitude: details?.latitude || null,
          longitude: details?.longitude || null,
          subcategory: details?.subcategory || [],
          awards: details?.awards || [],
          reviews: reviews.map(r => ({
            id: r.id,
            lang: r.lang,
            location_id: r.location_id,
            published_date: r.published_date,
            rating: r.rating,
            helpful_votes: r.helpful_votes,
            rating_image_url: r.rating_image_url,
            url: r.url,
            text: r.text,
            title: r.title,
            trip_type: r.trip_type,
            travel_date: r.travel_date,
            user: r.user ? {
              username: r.user.username,
              user_location: r.user.user_location,
              avatar: r.user.avatar
            } : null,
            subratings: r.subratings || null
          }))
        };

        const saved = await TripAdvisorHotel.create(hotelData);
        console.log(`   💾 Saved: "${hotelName}" → location_id=${locationId}, rating=${saved.rating}/5, ${saved.num_reviews} reviews`);

        results[hotelName] = {
          location_id: saved.location_id,
          name: saved.name,
          rating: saved.rating,
          num_reviews: saved.num_reviews,
          ranking: saved.ranking,
          price_level: saved.price_level,
          web_url: saved.web_url,
          rating_image_url: saved.rating_image_url,
          reviews: saved.reviews || [],
          from_cache: false
        };

        // Small delay between API calls to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`   ❌ Error fetching "${hotelName}": ${error.message}`);
        // If it's a duplicate key error, try to fetch from DB
        if (error.code === 11000) {
          try {
            const existing = await TripAdvisorHotel.findByNameAndCity(hotelName, city);
            if (existing) {
              results[hotelName] = {
                location_id: existing.location_id,
                name: existing.name,
                rating: existing.rating,
                num_reviews: existing.num_reviews,
                ranking: existing.ranking,
                price_level: existing.price_level,
                web_url: existing.web_url,
                rating_image_url: existing.rating_image_url,
                reviews: existing.reviews || [],
                from_cache: true
              };
            }
          } catch (dbErr) {
            console.error(`   ❌ DB fallback error: ${dbErr.message}`);
          }
        }
      }
    }

    const cachedCount = Object.values(results).filter(r => r.from_cache).length;
    const fetchedCount = Object.values(results).filter(r => !r.from_cache).length;
    console.log(`\n✅ TripAdvisor result: ${cachedCount} from DB, ${fetchedCount} freshly fetched, ${hotelNames.length - Object.keys(results).length} not found\n`);

    return results;
  }

  /**
   * Get reviews for a specific hotel by TripAdvisor location ID
   * First checks DB, only calls API if location not in DB
   * @param {string} locationId - TripAdvisor location ID
   * @param {string} language - Language code
   * @returns {Object} Hotel details with reviews
   */
  async getHotelReviews(locationId, language = 'en') {
    // Check DB first
    const existing = await TripAdvisorHotel.findOne({ location_id: locationId });
    if (existing && existing.reviews && existing.reviews.length > 0) {
      console.log(`📦 Reviews from DB for location ${locationId}`);
      return {
        location_id: existing.location_id,
        name: existing.name,
        rating: existing.rating,
        num_reviews: existing.num_reviews,
        rating_image_url: existing.rating_image_url,
        web_url: existing.web_url,
        reviews: existing.reviews,
        from_cache: true
      };
    }

    // Fetch from API
    const reviews = await this.getLocationReviews(locationId, language);

    // If we have the hotel in DB but without reviews, update it
    if (existing && reviews.length > 0) {
      existing.reviews = reviews.map(r => ({
        id: r.id,
        lang: r.lang,
        location_id: r.location_id,
        published_date: r.published_date,
        rating: r.rating,
        helpful_votes: r.helpful_votes,
        rating_image_url: r.rating_image_url,
        url: r.url,
        text: r.text,
        title: r.title,
        trip_type: r.trip_type,
        travel_date: r.travel_date,
        user: r.user ? {
          username: r.user.username,
          user_location: r.user.user_location,
          avatar: r.user.avatar
        } : null,
        subratings: r.subratings || null
      }));
      await existing.save();
    }

    return {
      location_id: locationId,
      name: existing?.name || null,
      rating: existing?.rating || null,
      num_reviews: existing?.num_reviews || '0',
      rating_image_url: existing?.rating_image_url || null,
      web_url: existing?.web_url || null,
      reviews: reviews,
      from_cache: false
    };
  }
}

module.exports = new TripAdvisorService();
