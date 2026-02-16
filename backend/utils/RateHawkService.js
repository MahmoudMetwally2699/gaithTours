const axios = require('axios');
require('dotenv').config();
const MarginService = require('./marginService');

/**
 * RateHawk API Service
 * Handles all interactions with the RateHawk (Emerging Travel Group) API
 */
class RateHawkService {
  constructor() {
    this.keyId = process.env.RATEHAWK_KEY_ID;
    this.apiKey = process.env.RATEHAWK_API_KEY;
    this.baseUrl = 'https://api.worldota.net/api/b2b/v3';

    // Country code to full name mapping (used for margin rule matching)
    this.countryCodeMap = {
      'SA': 'Saudi Arabia', 'AE': 'United Arab Emirates', 'EG': 'Egypt',
      'JO': 'Jordan', 'BH': 'Bahrain', 'KW': 'Kuwait', 'OM': 'Oman', 'QA': 'Qatar',
      'TR': 'Turkey', 'GB': 'United Kingdom', 'US': 'United States',
      'FR': 'France', 'DE': 'Germany', 'IT': 'Italy', 'ES': 'Spain',
      'TH': 'Thailand', 'MY': 'Malaysia', 'ID': 'Indonesia', 'SG': 'Singapore',
      'IN': 'India', 'PK': 'Pakistan', 'BD': 'Bangladesh', 'LK': 'Sri Lanka',
      'MA': 'Morocco', 'TN': 'Tunisia', 'LB': 'Lebanon'
    };

    // Cache for enriched hotel content (24 hour TTL)
    this.contentCache = new Map();
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
    this.staleCacheTTL = 7 * 24 * 60 * 60 * 1000; // 7 days for stale cache fallback

    // Cache for search results (shorter TTL for price freshness)
    this.searchCache = new Map();
    this.searchCacheTTL = 15 * 60 * 1000; // 15 minutes
    this.searchStaleCacheTTL = 6 * 60 * 60 * 1000; // 6 hours for stale search results

    // Cache for suggestions (region IDs) - saves ~200ms per search
    this.suggestionCache = new Map();
    this.suggestionCacheTTL = 24 * 60 * 60 * 1000; // 24 hours (region IDs rarely change)

    // Rate limiting and circuit breaker
    this.requestQueue = [];
    this.isProcessingQueue = false;
    // RateHawk rate limit: 10 requests per 60 seconds
    // Using sliding window instead of fixed delay — allows bursts when under limit
    this.rateLimitWindow = 60000; // 60 second window
    this.rateLimitMax = 10; // max requests per window
    this.requestTimestamps = []; // sliding window of request timestamps
    this.lastRequestTime = 0; // kept for backward compatibility

    // Circuit breaker pattern
    this.circuitBreaker = {
      failures: 0,
      threshold: 5, // Open circuit after 5 consecutive failures
      resetTimeout: 60000, // Try again after 60 seconds
      state: 'closed', // closed, open, half-open
      lastFailureTime: 0
    };

    // Request batching to reduce API calls
    this.pendingSearches = new Map();

    if (!this.keyId || !this.apiKey) {
      console.warn('⚠️ RateHawk credentials not configured. Set RATEHAWK_KEY_ID and RATEHAWK_API_KEY in .env');
    }

    // Margins are now ONLY controlled via dashboard margin rules
    console.log('💰 Hotel margins controlled via dashboard margin rules (no env fallback)');
  }

  /**
   * Clear search cache (useful when margin rules are updated)
   */
  clearSearchCache() {
    console.log('🗑️  Clearing search cache...');
    this.searchCache.clear();
    console.log('✅ Search cache cleared');
  }

  /**
   * Sleep utility for delays
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build guests array for API requests per RateHawk specifications
   * Distributes adults and children across rooms properly
   *
   * API Rules:
   * - Each array item = one room
   * - adults: 1-6 per room (required)
   * - children: array of ages (0-17), max 4 per room
   * - Max 6 total guests per room
   * - Max 9 rooms per request
   *
   * @param {number} adults - Total number of adults
   * @param {number[]} childrenAges - Array of children ages
   * @param {number} rooms - Number of rooms requested
   * @returns {Array} - guests array for API payload
   */
  buildGuestsArray(adults, childrenAges = [], rooms = 1) {
    // Ensure at least 1 room
    rooms = Math.max(1, Math.min(9, rooms));

    // Calculate adults per room (distribute evenly)
    const adultsPerRoom = Math.ceil(adults / rooms);

    // Build rooms array
    const guestsArray = [];
    let remainingAdults = adults;
    let remainingChildren = [...childrenAges];

    for (let i = 0; i < rooms; i++) {
      // Assign adults to this room (at least 1, max 6)
      const roomAdults = Math.min(6, Math.max(1, adultsPerRoom, remainingAdults));
      remainingAdults -= roomAdults;

      // Assign children to rooms with capacity (max 4 children, max 6 total guests)
      const maxChildrenForRoom = Math.min(4, 6 - roomAdults, remainingChildren.length);
      const roomChildren = remainingChildren.splice(0, maxChildrenForRoom);

      guestsArray.push({
        adults: roomAdults,
        children: roomChildren
      });
    }

    // If there are leftover children, distribute them to rooms with capacity
    while (remainingChildren.length > 0) {
      const roomWithCapacity = guestsArray.find(
        room => (room.adults + room.children.length) < 6 && room.children.length < 4
      );

      if (roomWithCapacity) {
        roomWithCapacity.children.push(remainingChildren.shift());
      } else {
        // No more capacity - log warning but don't lose data
        console.warn(`⚠️ Cannot fit all children: ${remainingChildren.length} children have no room capacity`);
        break;
      }
    }

    console.log(`👥 Built guests array: ${rooms} rooms, ${adults} adults, ${childrenAges.length} children`);
    return guestsArray;
  }

  /**
   * Generate cache key for search results
   */
  generateSearchCacheKey(regionId, params) {
    const { checkin, checkout, adults, children = [], currency = 'SAR' } = params;
    return `search_${regionId}_${checkin}_${checkout}_${adults}_${children.join(',')}_${currency}`;
  }

  /**
   * Check circuit breaker state
   */
  checkCircuitBreaker() {
    const now = Date.now();

    if (this.circuitBreaker.state === 'open') {
      if (now - this.circuitBreaker.lastFailureTime > this.circuitBreaker.resetTimeout) {
        console.log('🔄 Circuit breaker: Attempting half-open state');
        this.circuitBreaker.state = 'half-open';
        this.circuitBreaker.failures = 0;
        return true;
      }
      console.log('⚡ Circuit breaker: OPEN - Using cache only');
      return false;
    }

    return true;
  }

  /**
   * Record circuit breaker failure
   */
  recordFailure() {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.state = 'open';
      console.log(`🔴 Circuit breaker: OPENED after ${this.circuitBreaker.failures} failures - Pausing API calls for ${this.circuitBreaker.resetTimeout/1000}s`);
    }
  }

  /**
   * Record circuit breaker success
   */
  recordSuccess() {
    if (this.circuitBreaker.state === 'half-open') {
      console.log('✅ Circuit breaker: CLOSED - Resuming normal operation');
      this.circuitBreaker.state = 'closed';
    }
    this.circuitBreaker.failures = 0;
  }

  /**
   * Apply markup to net price (DEPRECATED - now uses dashboard margin rules only)
   * Kept for backward compatibility with tax calculations
   * @param {number} netPrice - The net price from RateHawk
   * @returns {number} - Price unchanged (0% markup)
   */
  applyMarkup(netPrice) {
    if (!netPrice || netPrice <= 0) return netPrice;
    // No fallback markup - margins are controlled via dashboard only
    return Math.round(netPrice);
  }

  /**
   * Apply dynamic margin based on margin rules from database
   * @param {number} netPrice - The net price from RateHawk
   * @param {Object} context - Booking context for rule matching (country, city, starRating, etc.)
   * @returns {Promise<{price: number, marginInfo: Object}>} - Price with margin and margin details
   */
  async applyDynamicMargin(netPrice, context = {}) {
    if (!netPrice || netPrice <= 0) return { price: netPrice, marginInfo: null };

    try {
      const marginInfo = await MarginService.getApplicableMargin(context);
      const result = MarginService.applyMargin(netPrice, marginInfo);

      // Update rule stats if a rule was applied
      if (marginInfo.rule && marginInfo.rule._id) {
        // Fire and forget - don't await to avoid slowing down response
        const MarginRule = require('../models/MarginRule');
        MarginRule.updateOne(
          { _id: marginInfo.rule._id },
          {
            $inc: {
              appliedCount: 1,
              totalRevenueGenerated: result.marginAmount
            }
          }
        ).catch(err => console.error('Error updating margin stats:', err));
      }

      return {
        price: result.finalPrice,
        marginInfo: {
          ruleName: marginInfo.rule?.name || 'Default',
          ruleId: marginInfo.rule?._id,
          marginType: marginInfo.marginType,
          marginValue: marginInfo.marginValue,
          marginAmount: result.marginAmount,
          isDefault: marginInfo.isDefault
        }
      };
    } catch (error) {
      console.error('Error applying dynamic margin, using base price:', error.message);
      // No fallback markup - return price unchanged
      return {
        price: Math.round(netPrice),
        marginInfo: { ruleName: 'None (Error)', isDefault: true, marginValue: 0 }
      };
    }
  }

  /**
   * Fetch hotel reviews from RateHawk Content API
   * @param {number[]} hids - Array of hotel IDs to fetch reviews for
   * @param {string} language - Language code (default: 'en')
   * @returns {Promise<Object>} - Reviews data keyed by hid
   */
  async getReviewsByHids(hids, language = 'en') {
    if (!hids || hids.length === 0) return {};

    try {
      // RateHawk API limit: max 100 hotels per request
      const MAX_BATCH_SIZE = 100;

      if (hids.length > MAX_BATCH_SIZE) {
        console.log(`📝 Fetching reviews from API for ${hids.length} hotels (in batches of ${MAX_BATCH_SIZE})...`);

        // Split into batches
        const batches = [];
        for (let i = 0; i < hids.length; i += MAX_BATCH_SIZE) {
          batches.push(hids.slice(i, i + MAX_BATCH_SIZE));
        }

        // Fetch each batch and merge results
        const allReviews = {};
        for (let i = 0; i < batches.length; i++) {
          console.log(`   Batch ${i + 1}/${batches.length}: Fetching ${batches[i].length} hotels...`);
          const batchReviews = await this._fetchReviewsBatch(batches[i], language);
          Object.assign(allReviews, batchReviews);

          // Add small delay between batches to avoid rate limiting
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        console.log(`✅ Fetched reviews for ${Object.keys(allReviews).length} hotels (across ${batches.length} batches)`);
        return allReviews;
      } else {
        // Single batch
        console.log(`📝 Fetching reviews from API for ${hids.length} hotels...`);
        return await this._fetchReviewsBatch(hids, language);
      }
    } catch (error) {
      console.error('❌ Error fetching reviews from API:', error.message);
      return {};
    }
  }

  /**
   * Internal method to fetch a single batch of reviews (max 100 hotels)
   * @param {Array} hids - Array of hotel IDs (max 100)
   * @param {string} language - Language code
   * @returns {Promise<Object>} Map of reviews keyed by hid
   */
  async _fetchReviewsBatch(hids, language = 'en') {
    try {
      const response = await this.makeRequest(
        '/content/v1/hotel_reviews_by_ids/',
        'POST',
        { hids, language },
        'https://api.worldota.net/api'
      );

      if (!response.data || response.error) {
        console.log('⚠️ No review data from API');
        return {};
      }

      // Transform response into a map keyed by hid
      const reviewsMap = {};
      for (const hotel of response.data) {
        if (hotel.hid && hotel.reviews) {
          // Calculate overall rating from individual reviews
          const reviews = hotel.reviews || [];
          const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
          const avgRating = reviews.length > 0 ? totalRating / reviews.length : null;

          // Calculate detailed ratings averages
          const detailedRatings = this.calculateDetailedRatings(reviews);

          reviewsMap[hotel.hid] = {
            hid: hotel.hid,
            hotel_id: hotel.id,
            overall_rating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
            average_rating: avgRating ? parseFloat(avgRating.toFixed(2)) : null,
            review_count: reviews.length,
            detailed_ratings: detailedRatings,
            reviews: reviews.slice(0, 10), // Limit to 10 reviews
            language
          };
        }
      }

      console.log(`✅ Fetched reviews for ${Object.keys(reviewsMap).length} hotels`);
      return reviewsMap;
    } catch (error) {
      throw error; // Re-throw to be handled by parent function
    }
  }

  /**
   * Calculate average detailed ratings from reviews
   * @param {Array} reviews - Array of review objects
   * @returns {Object} - Averaged detailed ratings
   */
  calculateDetailedRatings(reviews) {
    if (!reviews || reviews.length === 0) return null;

    const categories = ['cleanness', 'location', 'price', 'services', 'room', 'meal', 'wifi', 'hygiene'];
    const totals = {};
    const counts = {};

    for (const review of reviews) {
      const detailed = review.detailed_review || {};
      for (const cat of categories) {
        const value = detailed[cat];
        // Skip "unspecified" string values
        if (typeof value === 'number' && value > 0) {
          totals[cat] = (totals[cat] || 0) + value;
          counts[cat] = (counts[cat] || 0) + 1;
        }
      }
    }

    const result = {};
    for (const cat of categories) {
      if (counts[cat] > 0) {
        result[cat] = parseFloat((totals[cat] / counts[cat]).toFixed(1));
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Get reviews with hybrid approach: DB first, API fallback, save to DB
   * @param {number} hid - Hotel ID
   * @param {string} language - Language code
   * @param {number} maxAgeDays - Max age in days before considering stale (default: 7)
   * @returns {Promise<Object|null>} - Review data or null
   */
  async getOrFetchReviews(hid, language = 'en', maxAgeDays = 7) {
    const HotelReview = require('../models/HotelReview');
    const numericHid = parseInt(hid);

    try {
      // Step 1: Check database first
      const dbReview = await HotelReview.findOne({ hid: numericHid, language }).lean();

      if (dbReview) {
        // Check if data is stale
        const lastUpdated = dbReview.last_updated || dbReview.createdAt;
        const ageMs = Date.now() - new Date(lastUpdated).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);

        // OPTIMIZATION: If cached data has NO RATING, treat it as 'stale/invalid' to trigger fallback logic
        // preventing the system from indefinitely serving "null" just because it was recently checked.
        if (dbReview.overall_rating || dbReview.review_count) {
          if (ageDays < maxAgeDays) {
            console.log(`📦 Using cached reviews for HID ${hid} (${ageDays.toFixed(1)} days old)`);
            return dbReview;
          }
          console.log(`⏰ Reviews for HID ${hid} are stale (${ageDays.toFixed(1)} days) - refreshing...`);
        } else {
           console.log(`⚠️ Cached reviews for HID ${hid} are empty - ignoring cache to try fallback...`);
        }
      } else {
        console.log(`📝 No cached reviews for HID ${hid} - (API Disabled per user request)`);
      }

      // Step 2: Fetch from API - DISABLED
      // const apiReviews = await this.getReviewsByHids([numericHid], language);
      // let reviewData = apiReviews[numericHid];
      let reviewData = null; // Force null to skip API and go to fallbacks (cache-only)

      // Step 2b: If no reviews in requested language, try FALLBACK languages
      // Priority: Arabic -> Russian -> French -> German -> Spanish
      // (Russian is high priority as it often has data where others don't)
      if (!reviewData || (!reviewData.review_count && !reviewData.overall_rating)) {
        const fallbackLangs = ['ar', 'ru', 'fr', 'de', 'es', 'it'];
        // Remove requested language from fallback list
        const langsToCheck = fallbackLangs.filter(l => l !== language);

        console.log(`⚠️ No reviews in '${language}' for HID ${hid}. Checking fallbacks: ${langsToCheck.join(', ')}...`);

        // Check cache for fallbacks first (avoid API calls)
        for (const lang of langsToCheck) {
           const cached = await HotelReview.findOne({ hid: numericHid, language: lang }).lean();
           if (cached && (cached.overall_rating || cached.review_count)) {
             console.log(`✅ Found cached fallback reviews in '${lang}'!`);
             // Return hybrid object: Score from fallback, but marked as requested language (no text reviews)
             return {
               ...cached,
               language: language, // Masquerade as requested language
               reviews: [], // Hide text reviews to avoid language confusion
               _fallbackFrom: lang
             };
           }
        }

        console.log(`❌ No reviews found in primary language or cached fallbacks for HID ${hid}`);
        // PER USER REQUEST: Do NOT fetch fallbacks from API to save time.
        // If it's not in DB, we skip it.
      }

      if (reviewData) {
        // Step 3: Save to database (upsert)
        await HotelReview.findOneAndUpdate(
          { hid: numericHid, language },
          {
            ...reviewData,
            last_updated: new Date(),
            dump_date: new Date()
          },
          { upsert: true, new: true }
        );
        console.log(`💾 Saved reviews for HID ${hid} to database`);
        return reviewData;
      }

      // Return stale data if API failed but we had cached data
      if (dbReview) {
        console.log(`⚠️ API failed, using stale cached data for HID ${hid}`);
        return dbReview;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error in getOrFetchReviews for HID ${hid}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch filter values (languages, countries, amenities, etc.) from RateHawk
   * @returns {Promise<Object>} - Filter values data
   */
  async getFilterValues() {
    // Check in-memory cache first (24h validity)
    if (this.filterValuesCache && (Date.now() - this.filterValuesTimestamp < 24 * 60 * 60 * 1000)) {
      console.log('♻️  Serving filter values from cache');
      return this.filterValuesCache;
    }

    try {
      console.log('📝 Fetching filter values from RateHawk API...');
      const response = await this.makeRequest(
        '/content/v1/filter_values/',
        'GET', // Usually GET for this, but could be POST. Documentation implies simple retrieval.
        null,
        'https://api.worldota.net/api'
      );

      if (response.data) {
        // Cache the result
        this.filterValuesCache = response.data;
        this.filterValuesTimestamp = Date.now();
        console.log('✅ Fetched and cached filter values');
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('❌ Error fetching filter values:', error.message);
      return null;
    }
  }

  /**
   * Make authenticated request to RateHawk API with retry logic and rate limiting
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} data - Request payload
   * @param {string} customBaseUrl - Optional custom base URL (for Content API)
   * @param {number} retries - Number of retries left
   */
  async makeRequest(endpoint, method = 'POST', data = null, customBaseUrl = null, retries = 3) {
    // Rate limiting: Sliding window (10 requests per 60 seconds)
    const now = Date.now();
    // Remove timestamps older than the window
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < this.rateLimitWindow);

    if (this.requestTimestamps.length >= this.rateLimitMax) {
      // Window is full — wait until the oldest request expires
      const oldestInWindow = this.requestTimestamps[0];
      const waitTime = this.rateLimitWindow - (now - oldestInWindow) + 100; // +100ms safety
      console.log(`⏰ Rate limit: ${this.requestTimestamps.length}/${this.rateLimitMax} calls in window, waiting ${(waitTime/1000).toFixed(1)}s`);
      await this.sleep(waitTime);
      this.requestTimestamps = this.requestTimestamps.filter(t => Date.now() - t < this.rateLimitWindow);
    }

    this.requestTimestamps.push(Date.now());
    this.lastRequestTime = Date.now();

    try {
      const baseUrl = customBaseUrl || this.baseUrl;
      const config = {
        method,
        url: `${baseUrl}${endpoint}`,
        auth: {
          username: this.keyId,
          password: this.apiKey
        },
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      this.recordSuccess();
      return response.data;
    } catch (error) {
      // Handle rate limiting (429) with exponential backoff
      if (error.response?.status === 429) {
        this.recordFailure();

        if (retries > 0) {
          const backoffDelay = (4 - retries) * 3000; // 3s, 6s, 9s
          console.log(`⏰ Rate limit hit, retrying in ${backoffDelay/1000}s (${retries} retries left)...`);
          await this.sleep(backoffDelay);
          return this.makeRequest(endpoint, method, data, customBaseUrl, retries - 1);
        }
      }

      console.error('RateHawk API Error:', {
        endpoint,
        status: error.response?.status,
        message: error.response?.data || error.message
      });
      throw error;
    }
  }

  /**
   * Suggest hotels and regions based on search query
   * @param {string} query - Search query (e.g., "Rome", "Paris")
   * @param {string} language - Language code (default: 'en')
   * @returns {Promise<Object>} - Regions and hotels matching the query
   */
  async suggest(query, language = 'en') {
    // Check suggestion cache first (saves ~200ms per search)
    const cacheKey = `${query.toLowerCase().trim()}_${language}`;
    const cached = this.suggestionCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.suggestionCacheTTL) {
      console.log(`⚡ Using cached suggestion for "${query}" (saves ~200ms)`);
      return cached.data;
    }

    const response = await this.makeRequest('/search/multicomplete/', 'POST', {
      query,
      language
    });

    const result = {
      regions: response.data?.regions || [],
      hotels: response.data?.hotels || []
    };

    // Cache the result
    this.suggestionCache.set(cacheKey, {
      data: result,
      timestamp: now
    });

    return result;
  }

  /**
   * Get hotel contact information (phone, email) from RateHawk Content API
   * @param {string} hotelId - Hotel ID (string format like "hotel_name_city")
   * @param {string} language - Language code (default: 'en')
   * @returns {Promise<Object>} - Contact info with phone and email
   */
  async getHotelContactInfo(hotelId, language = 'en') {
    try {
      console.log(`📞 Fetching contact info for hotel ID: ${hotelId}`);

      const response = await this.makeRequest('/hotel/info/', 'POST', {
        id: String(hotelId), // Use string hotel ID
        language
      });

      // Debug: log full response structure
      console.log(`   📦 API Response status: ${response.status}`);

      if (response.status !== 'ok' || !response.data) {
        console.warn(`⚠️ Could not fetch contact info for hotel: ${hotelId}`);
        if (response.error) {
          console.warn(`   Error: ${response.error}`);
        }
        return { phone: null, email: null };
      }

      const hotelData = response.data;
      const phone = hotelData.phone || null;
      const email = hotelData.email || null;

      console.log(`   📞 Phone: ${phone || 'N/A'}`);
      console.log(`   📧 Email: ${email || 'N/A'}`);

      return { phone, email };
    } catch (error) {
      console.error(`❌ Error fetching hotel contact info for ${hotelId}:`, error.message);
      return { phone: null, email: null };
    }
  }

  /**
   * Search hotels by region with intelligent caching
   * @param {number} regionId - Region ID from suggest()
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} - Hotel search results with rates
   */
  async searchByRegion(regionId, params) {
    const {
      checkin,
      checkout,
      adults = 2,
      children = [],
      rooms = 1,
      residency = 'gb',
      language = 'en',
      currency = 'SAR',
      enrichmentLimit = 0, // Default 0 means no limit (enrich all)
      maxResults = 0, // NEW: Max hotels to return from API (0 = unlimited)
      refreshPrices = 0, // NEW: Number of top hotels to refresh prices from hotel details API
      page, // Pagination: Page number
      limit, // Pagination: Items per page
      // API-LEVEL FILTERS (new)
      stars = null, // Array of star ratings [1,2,3,4,5]
      mealFilter = null, // Array of meal types ['breakfast', 'half_board', etc.]
      facilitiesFilter = null // Array of facility filters ['free_wifi', 'parking', etc.]
    } = params;

    // Generate cache key for this search
    // NOTE: Filters are NOT included in cache key because:
    // 1. RateHawk SERP API doesn't support filtering
    // 2. We filter post-API in hotels.js
    // 3. This allows ONE API call to serve ALL filter variations → reduces rate limits
    const cacheKey = this.generateSearchCacheKey(regionId, { checkin, checkout, adults, children, currency, page, limit });
    const now = Date.now();

    // Check fresh cache first
    const cachedSearch = this.searchCache.get(cacheKey);
    if (cachedSearch && (now - cachedSearch.timestamp) < this.searchCacheTTL) {
      const age = Math.round((now - cachedSearch.timestamp) / 1000 / 60);
      console.log(`✨ Using cached search results (${age} min old)`);
      return cachedSearch.data;
    }

    // Check circuit breaker before making API call
    const canMakeRequest = this.checkCircuitBreaker();

    if (!canMakeRequest) {
      // Circuit breaker is open, try stale cache
      if (cachedSearch && (now - cachedSearch.timestamp) < this.searchStaleCacheTTL) {
        const age = Math.round((now - cachedSearch.timestamp) / 1000 / 60);
        console.log(`⚡ Circuit breaker open - Using stale cache (${age} min old)`);
        return cachedSearch.data;
      }
      throw new Error('Service temporarily unavailable - please try again in a moment');
    }

    // Try to make the API request
    try {
      const apiPayload = {
        region_id: regionId,
        checkin,
        checkout,
        residency,
        language,
        guests: this.buildGuestsArray(adults, children, rooms),
        currency
      };

      // Add pagination to API payload if provided
      if (page) apiPayload.page = parseInt(page);
      if (limit) apiPayload.limit = parseInt(limit);

      // NOTE: RateHawk SERP API does NOT support filtering by star_rating, meal, or facilities
      // These filters are applied post-API using data from Content API (local DB enrichment)
      // The filter params are still used in cache key generation for proper caching
      // Keeping this code commented for reference in case API adds support later
      /*
      if (stars && stars.length > 0) {
        apiPayload.star_rating = stars;
        console.log(`   🌟 API filter: star_rating = [${stars.join(', ')}]`);
      }
      if (mealFilter && mealFilter.length > 0) {
        const mealMapping = { 'breakfast': 'breakfast', 'half_board': 'halfboard', 'full_board': 'fullboard', 'all_inclusive': 'allinclusive' };
        apiPayload.meal = mealFilter.map(m => mealMapping[m] || m).filter(Boolean);
      }
      if (facilitiesFilter && facilitiesFilter.length > 0) {
        const facilityMapping = { 'free_wifi': 'has_internet', 'parking': 'has_parking', 'pool': 'has_pool', 'spa': 'has_spa', 'gym': 'has_fitness' };
        apiPayload.serp_filters = facilitiesFilter.map(f => facilityMapping[f]).filter(Boolean);
      }
      */

      const response = await this.makeRequest('/search/serp/region/', 'POST', apiPayload);
      console.log(`   ⏱️ RateHawk SERP API responded in ${Date.now() - now}ms with ${response.data?.hotels?.length || 0} hotels`);

      // Calculate number of nights for per-night pricing
      const checkinDate = new Date(checkin);
      const checkoutDate = new Date(checkout);
      const nights = Math.max(1, Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)));

      // Normalize response to match frontend expectations
    let hotels = (response.data?.hotels || []).map(hotel => {
      // Find the rate with the LOWEST price (not just the first rate)
      // This ensures search results show the same "From" price as details page
      let lowestRate = hotel.rates?.[0];
      let lowestPrice = Infinity;
      const availableMeals = new Set();


      if (hotel.rates && hotel.rates.length > 0) {
        for (const rate of hotel.rates) {
          if (rate.meal) availableMeals.add(rate.meal);
          const pt = rate.payment_options?.payment_types?.[0];
          const showAmt = pt?.show_amount || pt?.amount || Infinity;

          // Calculate included taxes to get base price
          let rateBasePrice = showAmt;
          if (pt?.tax_data?.taxes) {
            const includedTaxes = pt.tax_data.taxes
              .filter(t => t.included_by_supplier)
              .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            rateBasePrice = showAmt - includedTaxes;
          }

          if (rateBasePrice < lowestPrice) {
            lowestPrice = rateBasePrice;
            lowestRate = rate;
          }
        }
      }

      const paymentType = lowestRate?.payment_options?.payment_types?.[0];

      // Check for free cancellation and prepayment (using lowest rate)
      const paymentOptions = lowestRate?.payment_options;
      // BUGFIX: cancellation_penalties is inside payment_types[0], not at rate level
      // The API returns: payment_options.payment_types[0].cancellation_penalties.free_cancellation_before
      const cancellationPenalties = paymentType?.cancellation_penalties;

      const isFreeCancellation = this.checkFreeCancellation(cancellationPenalties);
      const isNoPrepayment = paymentOptions?.payment_types?.some(pt => pt.is_need_credit_card_data === false) ||
                             paymentOptions?.pay_at_hotel === true;

      // Generate placeholder image (will be replaced with real images if available)
      const placeholderImage = `https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=${encodeURIComponent(hotel.id.substring(0, 20))}`;

      // Calculate total price and price per night (with markup applied)
      // Calculate total price (Exclusive of taxes, consistent with Details page)
      const showAmount = paymentType?.show_amount || paymentType?.amount || 0;
      let basePrice = showAmount;
      let totalTaxes = 0;

      if (paymentType?.tax_data?.taxes) {
        // Calculate ALL taxes (both included and pay at hotel)
        totalTaxes = paymentType.tax_data.taxes
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        // Calculate included taxes to get base price
        const includedTaxes = paymentType.tax_data.taxes
          .filter(t => t.included_by_supplier)
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        basePrice = showAmount - includedTaxes;
      }

      const bookingTaxes = paymentType?.tax_data?.taxes
        ? paymentType.tax_data.taxes
            .filter(t => t.included_by_supplier)
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
        : 0;


      const totalPrice = basePrice; // No markup yet - will be applied dynamically after enrichment
      const pricePerNight = totalPrice > 0 ? Math.round(totalPrice / nights) : 0;

      return {
        id: hotel.hid?.toString() || hotel.id, // Use hid as id for frontend compatibility
        hid: hotel.hid,
        hotelId: hotel.id, // Keep original ID for static content lookup
        name: hotel.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format ID as name fallback
        rating: null, // Will be set from hotel_reviews collection only
        reviewScore: null, // Will be set from hotel_reviews collection only
        reviewCount: null, // Will be set from hotel_reviews collection only
        price: totalPrice, // Base price without taxes (margin will be applied later)
        pricePerNight: pricePerNight, // New field for per-night display
        nights: nights, // Include nights for reference
        currency: paymentType?.show_currency_code || currency,
        total_taxes: Math.round(totalTaxes), // Total taxes amount (to be displayed separately)
        booking_taxes: bookingTaxes, // Taxes included in booking (pay now)
        taxes_currency: paymentType?.show_currency_code || currency,
        image: placeholderImage,
        match_hash: lowestRate?.match_hash,
        meal: lowestRate?.meal,
        availableMeals: Array.from(availableMeals),
        room_name: lowestRate?.room_name,
        // Rate policies for filters
        free_cancellation: isFreeCancellation,
        no_prepayment: isNoPrepayment,
        payment_options: paymentOptions,
        // ETG serp_filters for facility filtering (e.g., 'has_bathroom', 'has_internet', 'has_parking')
        serp_filters: lowestRate?.serp_filters || [],
        // Room amenities data for filtering
        amenities_data: lowestRate?.amenities_data || [],
        // PERF: Derive amenities from serp_filters so we don't need to fetch from DB
        amenities: (() => {
          const filters = lowestRate?.serp_filters || [];
          const mapped = [];
          if (filters.includes('has_internet')) mapped.push('WiFi');
          if (filters.includes('has_pool')) mapped.push('Swimming Pool');
          if (filters.includes('has_parking')) mapped.push('Parking');
          if (filters.includes('has_fitness')) mapped.push('Gym');
          if (filters.includes('has_spa')) mapped.push('Spa');
          if (filters.includes('has_restaurant')) mapped.push('Restaurant');
          if (filters.includes('has_conditioning')) mapped.push('Air Conditioning');
          if (filters.includes('has_bathroom')) mapped.push('Private Bathroom');
          return mapped;
        })()
      };
    });

    // OPTIMIZATION: Trim results if maxResults is specified
    if (maxResults > 0 && hotels.length > maxResults) {
      console.log(`✂️  Trimming API results from ${hotels.length} to ${maxResults} hotels`);
      hotels = hotels.slice(0, maxResults);
    }

    const enrichStart = Date.now();

    // Fetch images for hotels using Content API (max 100 per request)
    let hotelHids = hotels.map(h => h.hid).filter(hid => hid);

    // OPTIMIZATION: Start review query + margin rules fetch IN PARALLEL with DB enrichment
    // These are independent DB queries — no reason to run them sequentially
    const HotelReviewParallel = require('../models/HotelReview');
    const reviewPromise = hotelHids.length > 0
      ? HotelReviewParallel.find({ hid: { $in: hotelHids }, language: 'en' })
          .select('hid overall_rating review_count average_rating').lean()
          .catch(err => { console.error('⚠️ Review pre-fetch error:', err.message); return []; })
      : Promise.resolve([]);
    const marginRulesPromise = MarginService.getCachedRules()
      .catch(err => { console.error('⚠️ Margin rules pre-fetch error:', err.message); return []; });

    // LOCAL DB ENRICHMENT: No rate limits, so always enrich all hotels
    // The enrichmentLimit parameter is kept for backward compatibility but ignored
    const dbStart = Date.now();
    console.log(`📍 Fetching location/image data for ${hotelHids.length} hotels using Local DB`);

    if (hotelHids.length > 0) {
      try {
        const contentMap = new Map();
        const now = Date.now();

        // Separate cached and uncached hotels
        const uncachedHids = [];
        hotelHids.forEach(hid => {
          const cached = this.contentCache.get(hid);
          if (cached && (now - cached.timestamp) < this.cacheTTL) {
            contentMap.set(hid, cached.data);
          } else {
            uncachedHids.push(hid);
          }
        });

        if (contentMap.size > 0) {
          console.log(`   ♻️  Using cached data for ${contentMap.size} hotels`);
        }

        // Only fetch uncached hotels
        if (uncachedHids.length > 0) {
          console.log(`   📍 Fetching data for ${uncachedHids.length} hotels from Local DB`);
          const HotelContent = require('../models/HotelContent');

          // Split into batches to avoid huge DB queries
          const batchSize = 500;
          const batches = [];
          for (let i = 0; i < uncachedHids.length; i += batchSize) {
            batches.push(uncachedHids.slice(i, i + batchSize));
          }

          // PERF: Run ALL batches in parallel instead of sequentially
          const batchResults = await Promise.all(batches.map(async (batch, i) => {
            try {
              // Query Local DB - OPTIMIZED: Only fetch fields we actually use
              // PERF: Use $slice to fetch only first image instead of entire images array
              // PERF: Fetch only fields we actually use (+amenities for search card icons)
              const localHotels = await HotelContent.find(
                { hid: { $in: batch } },
                {
                  hid: 1, hotelId: 1, name: 1, nameAr: 1, address: 1,
                  city: 1, country: 1, countryCode: 1, starRating: 1,
                  mainImage: 1, amenities: 1, latitude: 1, longitude: 1,
                  images: { $slice: 1 }
                }
              ).lean();
              console.log(`   ✅ Found ${localHotels.length}/${batch.length} hotels in local DB (Batch ${i+1})`);
              return { hotels: localHotels, batch, index: i };
            } catch (error) {
              console.error(`   ⚠️ Batch ${i + 1} failed:`, error.message);
              return { hotels: [], batch, index: i, error };
            }
          }));

          // Process all batch results
          for (const result of batchResults) {
            if (result.error?.response?.status === 429) {
              result.batch.forEach(hid => {
                const cached = this.contentCache.get(hid);
                if (cached && (now - cached.timestamp) < this.staleCacheTTL) {
                  contentMap.set(hid, cached.data);
                }
              });
              continue;
            }

            result.hotels.forEach(hotel => {
                // Map local DB structure to match what the frontend expects
                let imageUrl = null;
                // Prioritize images array structure from local DB
                if (hotel.images && hotel.images.length > 0) {
                   const img = hotel.images[0];
                   imageUrl = (typeof img === 'string' ? img : img.url)?.replace('{size}', '640x400');
                } else if (hotel.mainImage) {
                   imageUrl = hotel.mainImage.replace('{size}', '640x400');
                }

                // Map country code to name (must be consistent with hotel details)
                const countryName = hotel.country || this.countryCodeMap[hotel.countryCode] || hotel.countryCode;

                // Debug: Log if country/city is missing
                if (!hotel.country && !hotel.countryCode) {
                  console.log(`   ⚠️  Hotel ${hotel.name} (HID: ${hotel.hid}) missing country data`);
                }

                // Add to content map - include amenities for search card display
                const contentData = {
                  name: hotel.name,
                  nameAr: hotel.nameAr || null,
                  address: hotel.address,
                  city: hotel.city,
                  country: countryName,
                  image: imageUrl,
                  images: imageUrl ? [imageUrl] : [],
                  star_rating: hotel.starRating,
                  kind: 'Hotel',
                  hid: hotel.hid,
                  amenities: hotel.amenities || [],
                  latitude: hotel.latitude || null,
                  longitude: hotel.longitude || null
                };
                contentMap.set(hotel.hid, contentData);

                // Update internal cache
                this.contentCache.set(hotel.hid, {
                  data: contentData,
                  timestamp: now
                });
              });
          }
        }

        console.log(`✅ Local DB returned ${contentMap.size} hotels with images`);

        // Update hotels with Content API data and mark enrichment status
        hotels.forEach(hotel => {
          const content = contentMap.get(hotel.hid);
          if (content) {
            if (content.image) hotel.image = content.image;
            if (content.name) hotel.name = content.name;
            if (content.nameAr) hotel.nameAr = content.nameAr;
            if (content.address) hotel.address = content.address;
            if (content.city) hotel.city = content.city;
            if (content.country) hotel.country = content.country;
            // star_rating = hotel stars (1-5) from Content API
            // rating = review score (1-10) from Search API - keep it unchanged!
            if (content.star_rating) hotel.star_rating = content.star_rating;

            // Merge DB amenities with API-derived amenities (serp_filters)
            // API gives rate-level amenities, DB gives hotel-level amenities — combine both
            if (content.amenities && content.amenities.length > 0) {
              const existing = new Set((hotel.amenities || []).map(a => a.toLowerCase()));
              for (const a of content.amenities) {
                if (!existing.has(a.toLowerCase())) {
                  hotel.amenities.push(a);
                }
              }
            }
            if (content.facilities) hotel.facilities = content.facilities;

            // Add coordinates for distance calculation
            if (content.latitude) hotel.latitude = content.latitude;
            if (content.longitude) hotel.longitude = content.longitude;

            hotel.isEnriched = true; // Mark as successfully enriched
          } else {
            hotel.isEnriched = false; // Not enriched
          }
        });

        console.log(`   Enriched ${contentMap.size}/${hotels.length} hotels with data`);
      } catch (error) {
        console.error('❌ Image fetch error:', error.message);
        console.error('   Response status:', error.response?.status);
        console.error('   Response data:', JSON.stringify(error.response?.data).substring(0, 200));
      }
    }

    console.log(`   ⏱️ DB enrichment phase took ${Date.now() - dbStart}ms`);

    // Apply dynamic margins based on margin rules
    // Now that hotels have country/city/star_rating from enrichment, we can match rules
    const marginStart = Date.now();
    console.log(`💰 Applying dynamic margins to ${hotels.length} hotels...`);
    const HotelContent = require('../models/HotelContent');
    const MarginRule = require('../models/MarginRule');

    // OPTIMIZATION: Margin rules were pre-fetched in parallel with DB enrichment
    const allRules = await marginRulesPromise;

    // OPTIMIZATION: Collect stats for batched update instead of per-hotel updates
    const ruleStats = new Map();

    for (const hotel of hotels) {
      // Get country info from hotel object (already enriched from HotelContent above)
      const countryName = hotel.country;
      const cityName = hotel.city;

      const context = {
        country: countryName,
        city: cityName,
        starRating: hotel.star_rating,
        bookingValue: hotel.price,
      };

      // Skip rule matching if location data is missing (use default margin)
      let matchingRule = null;
      if (countryName && countryName !== 'undefined') {
        // OPTIMIZATION: Use indexed lookup for O(1) country matching instead of O(n)
        const candidateRules = MarginService.getRulesForCountry(countryName);
        matchingRule = MarginService.findMatchingRule(context, candidateRules);
      }

      const marginInfo = matchingRule ? {
        rule: matchingRule,
        marginType: matchingRule.type,
        marginValue: matchingRule.type === 'fixed' ? matchingRule.fixedAmount : matchingRule.value,
        isDefault: false
      } : {
        rule: null,
        marginType: 'percentage',
        marginValue: 0, // Default 0%
        isDefault: true
      };

      // UPDATED: Apply margin to (base price + booking taxes) instead of just base price
      // This ensures margin is calculated on the total amount paid at booking time
      const marginBase = (hotel.price || 0) + (hotel.booking_taxes || 0);
      const priceResult = MarginService.applyMargin(marginBase, marginInfo);

      // Calculate the margin percentage to apply to taxes
      const marginMultiplier = marginBase > 0 ? priceResult.finalPrice / marginBase : 1;

      // The final price includes the margin on (price + booking_taxes)
      // We need to separate it back: final_price = original_price + margin_on_total
      hotel.price = priceResult.finalPrice; // Total price with margin (includes booking taxes)
      hotel.pricePerNight = hotel.nights > 0 ? Math.round(priceResult.finalPrice / hotel.nights) : priceResult.finalPrice;

      // Apply margin to tax display amounts as well
      const originalTotalTaxes = hotel.total_taxes;
      const originalBookingTaxes = hotel.booking_taxes;
      hotel.total_taxes = Math.round((hotel.total_taxes || 0) * marginMultiplier);
      hotel.booking_taxes = Math.round((hotel.booking_taxes || 0) * marginMultiplier);

      // Debug: Log first hotel margin application
      if (hotels.indexOf(hotel) === 0) {
        console.log(`   🔍 Search margin debug: price=${priceResult.finalPrice}, multiplier=${marginMultiplier.toFixed(4)}`);
        console.log(`      original_taxes=${originalTotalTaxes} → adjusted=${hotel.total_taxes}`);
        console.log(`      booking_taxes=${originalBookingTaxes} → adjusted=${hotel.booking_taxes}`);
      }

      hotel.marginApplied = {
          ruleName: matchingRule?.name || 'Default',
          marginPercentage: priceResult.marginPercentage,
          marginAmount: priceResult.marginAmount
      };

      // Collect stats for batched update
      if (matchingRule && matchingRule._id) {
        const ruleId = matchingRule._id.toString();
        ruleStats.set(ruleId, (ruleStats.get(ruleId) || 0) + 1);
      }
    }

    // OPTIMIZATION: Single bulkWrite for all stats updates instead of N individual updates
    if (ruleStats.size > 0) {
      const mongoose = require('mongoose');
      const bulkOps = [...ruleStats.entries()].map(([id, count]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id) },
          update: { $inc: { appliedCount: count } }
        }
      }));
      MarginRule.bulkWrite(bulkOps).catch(() => {}); // Fire and forget
    }

    console.log(`   ⏱️ Margin application took ${Date.now() - marginStart}ms`);

    // PERFORMANCE OPTIMIZATION: Reviews were pre-fetched in parallel with DB enrichment
    // No additional DB query needed — just await the result started earlier
    const reviewStart = Date.now();
    try {
      const reviewSummaries = await reviewPromise;

      if (reviewSummaries.length > 0) {
        // Create lookup map
        const reviewMap = new Map();
        reviewSummaries.forEach(review => {
          reviewMap.set(review.hid, {
            overall_rating: review.overall_rating,
            review_count: review.review_count,
            average_rating: review.average_rating
          });
        });

        // Apply ratings to hotels (DB only - no API fetching)
        let enrichedCount = 0;
        hotels.forEach(hotel => {
          const reviewData = reviewMap.get(hotel.hid);
          if (reviewData && reviewData.overall_rating != null) {
            hotel.rating = reviewData.overall_rating;
            hotel.reviewScore = reviewData.overall_rating;
            hotel.reviewCount = reviewData.review_count || 0;
            enrichedCount++;
          }
        });

        console.log(`   ⭐ Enriched ${enrichedCount}/${hotels.length} hotels with review ratings (parallel fetch)`);
      }
    } catch (reviewError) {
      console.error('⚠️ Error enriching hotels with review ratings:', reviewError.message);
      // Continue without review data - not critical
    }

    console.log(`   ⏱️ Review enrichment took ${Date.now() - reviewStart}ms`);

    // NOTE: TripAdvisor enrichment is handled at the route level (hotels.js /search)
    // to avoid duplicate DB queries. The route handler does batch + fuzzy + background fetch.

    // Refresh prices from hotel details API for top hotels (if requested)
    if (refreshPrices > 0 && hotels.length > 0) {
      console.log(`💲 Refreshing accurate prices for top ${Math.min(refreshPrices, hotels.length)} hotels from Hotel Details API...`);

      const hotelsToRefresh = hotels.slice(0, refreshPrices);

      // Process hotels in batches of 3 to avoid rate limiting
      const batchSize = 3;
      const batches = [];
      for (let i = 0; i < hotelsToRefresh.length; i += batchSize) {
        batches.push(hotelsToRefresh.slice(i, i + batchSize));
      }

      // Process each batch sequentially, hotels within batch in parallel
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`   Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} hotels)...`);

        const batchPromises = batch.map(async (hotel) => {
          try {
            // Fetch hotel details to get accurate lowest price
            const details = await this.getHotelDetails(hotel.hid, {
              checkin,
              checkout,
              adults,
              children,
              rooms,
              currency,
              language
            });

            if (details && details.rates && details.rates.length > 0) {
              // Find the cheapest rate from hotel details
              const cheapestRate = details.rates.reduce((min, rate) => {
                return rate.price < min.price ? rate : min;
              }, details.rates[0]);

              // Update hotel price with the accurate cheapest price
              const oldPrice = hotel.price;
              hotel.price = cheapestRate.price;
              hotel.pricePerNight = hotel.nights > 0 ? Math.round(cheapestRate.price / hotel.nights) : cheapestRate.price;
              hotel.match_hash = cheapestRate.match_hash;
              hotel.room_name = cheapestRate.room_name;
              hotel.meal = cheapestRate.meal;

              if (oldPrice !== cheapestRate.price) {
                console.log(`   💰 Updated ${hotel.name}: $${oldPrice.toFixed(2)} → $${cheapestRate.price.toFixed(2)}`);
              }
            }
          } catch (error) {
            // If refresh fails, keep the original SERP price
            console.log(`   ⚠️  Price refresh failed for ${hotel.name}: ${error.message}`);
          }
        });

        // Wait for current batch to complete before moving to next
        await Promise.all(batchPromises);

        // Add delay between batches to avoid rate limiting
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }

      console.log(`   ✅ Price refresh complete`);
    }

    const result = {
      hotels,
      total: response.data?.total_hotels || hotels.length,
      debug: response.debug
    };

    console.log(`   ⏱️ Post-API enrichment took ${Date.now() - enrichStart}ms for ${hotels.length} hotels`);

    // Cache the search result for future use
    this.searchCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
    } catch (error) {
      // On 429 error, try to serve stale cache
      if (error.response?.status === 429) {
        console.log(`⏰ Rate limit hit for region ${regionId}, checking for stale cache...`);

        if (cachedSearch && (now - cachedSearch.timestamp) < this.searchStaleCacheTTL) {
          const age = Math.round((now - cachedSearch.timestamp) / 1000 / 60);
          console.log(`✅ Serving stale cache for region ${regionId} (${age} min old)`);
          return cachedSearch.data;
        }

        console.log(`❌ No cached data available and rate limited`);
      }

      throw error;
    }
  }

  /**
   * Check if a rate has free cancellation
   * @param {Object} cancellationPenalties - Cancellation penalties object
   * @returns {boolean} - True if free cancellation is available
   */
  checkFreeCancellation(cancellationPenalties) {
    if (!cancellationPenalties) return false;

    // Check free_cancellation_before field first (ETG recommended approach)
    if (cancellationPenalties.free_cancellation_before) {
      const freeCancelDeadline = new Date(cancellationPenalties.free_cancellation_before);
      const now = new Date();
      if (freeCancelDeadline > now) {
        return true;
      }
    }

    // Fallback: Check policies array
    if (cancellationPenalties.policies && cancellationPenalties.policies.length > 0) {
      const now = new Date();
      return cancellationPenalties.policies.some(policy => {
        // Check if there's a policy period where cancellation is free
        const deadline = new Date(policy.end_at || policy.start_at);
        const isBeforeDeadline = deadline > now;
        const isNoCharge = policy.amount_charge === 0 ||
                           policy.amount_charge === null ||
                           policy.amount_charge === '0' ||
                           policy.percent_charge === 0 ||
                           policy.percent_charge === '0';
        return isBeforeDeadline && isNoCharge;
      });
    }

    return false;
  }

  /**
   * Get detailed hotel information with rates
   * @param {number} hid - Hotel ID (numeric)
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} - Detailed hotel information
   */
  async getHotelDetails(hid, params) {
    const {
      checkin,
      checkout,
      adults = 2,
      children = [],
      rooms = 1,
      residency = 'sa',
      language = 'en',
      currency = 'SAR',
      match_hash = null,
      _cachedStaticContent = null, // Pre-cached raw HotelContent document
      _cachedReviewData = null     // Pre-cached review data
    } = params;

    const payload = {
      hid,
      checkin,
      checkout,
      residency,
      language,
      guests: this.buildGuestsArray(adults, children, rooms),
      currency
    };

    // Debug: Log the currency being sent to RateHawk API
    console.log(`   💱 RateHawk HP API: HID=${hid}, currency=${currency}, dates=${checkin}→${checkout}`);

    // Include match_hash if provided (for rate matching)
    if (match_hash) {
      payload.match_hash = match_hash;
    }

    // OPTIMIZATION: Fetch pricing, static content, AND reviews in PARALLEL
    // If raw DB docs are pre-cached, skip those DB queries (saves ~200-500ms)
    const HotelContent = require('../models/HotelContent');

    // When language is not English, fetch English rates in parallel
    // so we can map room images using English room names (room_groups in DB are English)
    const needsEnglishLookup = language !== 'en';
    const enPayload = needsEnglishLookup ? { ...payload, language: 'en' } : null;

    const hasCachedStatic = !!_cachedStaticContent;
    const hasCachedReviews = !!_cachedReviewData;

    console.log(`   🚀 Fetching in PARALLEL: [HP API${hasCachedStatic ? '' : ' + DB content'}${hasCachedReviews ? '' : ' + Reviews'}${needsEnglishLookup ? ' + EN rates' : ''}]`);
    const parallelStart = Date.now();

    // Wrap each with individual timers
    const hpApiPromise = this.makeRequest('/search/hp/', 'POST', payload).then(r => {
      console.log(`      ⏱️ HP API (rates): ${Date.now() - parallelStart}ms — ${r.data?.hotels?.[0]?.rates?.length || 0} rates`);
      return r;
    });
    const dbContentPromise = hasCachedStatic
      ? Promise.resolve(_cachedStaticContent).then(r => { console.log(`      ⚡ DB content: from cache (0ms)`); return r; })
      : HotelContent.findOne({ hid }).lean().then(r => {
        console.log(`      ⏱️ DB content: ${Date.now() - parallelStart}ms — ${r?.images?.length || 0} imgs, ${r?.amenityGroups?.length || 0} amenity groups`);
        return r;
      });
    const reviewPromise = hasCachedReviews
      ? Promise.resolve(_cachedReviewData).then(r => { console.log(`      ⚡ Reviews: from cache (0ms)`); return r; })
      : this.getOrFetchReviews(hid, 'en', 7).then(r => {
        console.log(`      ⏱️ Reviews: ${Date.now() - parallelStart}ms — rating ${r?.overall_rating || 'N/A'}, ${r?.review_count || 0} reviews`);
        return r;
      });
    const enRatesPromise = needsEnglishLookup
      ? this.makeRequest('/search/hp/', 'POST', enPayload).then(r => {
        console.log(`      ⏱️ EN rates (room names): ${Date.now() - parallelStart}ms`);
        return r;
      }).catch(err => {
        console.log(`      ⚠️ EN rates failed (non-critical): ${err.message}`);
        return null;
      })
      : Promise.resolve(null);

    const [response, staticContent, reviewData, enResponse] = await Promise.all([
      hpApiPromise, dbContentPromise, reviewPromise, enRatesPromise
    ]);
    console.log(`   ⏱️ Parallel fetch phase TOTAL: ${Date.now() - parallelStart}ms`);
    const hotelData = response.data?.hotels?.[0];
    if (!hotelData) {
      throw new Error('Hotel not found');
    }

    // Build match_hash → English room name map for cross-language image matching
    const matchHashToEnName = new Map();
    if (enResponse) {
      const enHotelData = enResponse.data?.hotels?.[0];
      if (enHotelData?.rates) {
        enHotelData.rates.forEach(rate => {
          if (rate.match_hash && rate.room_name) {
            matchHashToEnName.set(rate.match_hash, rate.room_name);
          }
        });
        console.log(`🌐 Built English room name map: ${matchHashToEnName.size} entries (for ${language} image matching)`);
      }
    }

    // Compact logging for static content and reviews
    if (staticContent) {
      console.log(`✅ Local content: ${staticContent.name}, ${staticContent.images?.length || 0} imgs`);
    }
    if (reviewData) {
      console.log(`⭐ Reviews: ${reviewData.overall_rating} rating, ${reviewData.review_count} reviews`);
    }

    // Extract images from static content
    const images = [];

    // Prioritize images from local DB structure
    if (staticContent?.images && staticContent.images.length > 0) {
       staticContent.images.forEach(img => {
         // Handle both string URLs (legacy/simple) and object structure
         const url = typeof img === 'string' ? img : img.url;
         if (url) {
           const imageUrl = url.replace('{size}', '1024x768');
           images.push(imageUrl);
         }
       });
    }
    // Fallback to images_ext if images array was empty/missing (legacy dump format)
    else if (staticContent?.images_ext && staticContent.images_ext.length > 0) {
      staticContent.images_ext.forEach(img => {
        if (img.url) {
          const imageUrl = img.url.replace('{size}', '1024x768');
          images.push(imageUrl);
        }
      });
    }


    console.log(`   ✅ Extracted ${images.length} images total`);

    // Extract amenities from static content (support both Local DB camelCase and API snake_case)
    const amenities = [];
    const amenityGroups = staticContent?.amenityGroups || staticContent?.amenity_groups;
    if (amenityGroups && amenityGroups.length > 0) {
      console.log(`   Amenity groups found: ${amenityGroups.length}`);
      amenityGroups.forEach(group => {
        // Handle both Local DB structure (amenities array) and API structure
        if (group.amenities) {
          group.amenities.forEach(amenity => {
            // Handle both string and object amenities
            const amenityName = typeof amenity === 'string' ? amenity : amenity.name;
            if (amenityName) {
              amenities.push(amenityName);
            }
          });
        }
      });
    } else if (staticContent?.amenities && staticContent.amenities.length > 0) {
      // Fallback to flat amenities array if groups not available
      console.log(`   Using flat amenities array: ${staticContent.amenities.length}`);
      amenities.push(...staticContent.amenities);
    } else {
      console.log(`   ⚠️ No amenity_groups in static content`);
    }

    console.log(`   📊 Extracted: ${images.length} images, ${amenities.length} amenities`);

    // Extract room images and amenities from room_groups
    const roomProcessStart = Date.now();
    const roomImagesMap = new Map();
    const roomAmenitiesMap = new Map();

    // Helper function to normalize room names for matching
    const normalizeRoomName = (name) => {
      if (!name) return '';
      return name
        .toLowerCase()
        .replace(/[()]/g, '')     // Remove parentheses but keep content
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim();
    };

    // Use roomGroups (local DB) or room_groups (API)
    const roomGroups = staticContent?.roomGroups || staticContent?.room_groups;

    if (roomGroups && roomGroups.length > 0) {
      console.log(`   🛏️  Processing ${roomGroups.length} room groups for images and amenities`);

      roomGroups.forEach(roomGroup => {
        const roomName = roomGroup.name || roomGroup.rg_ext?.name;
        if (!roomName) return;

        const roomImages = [];
        const roomAmenities = [];

        // STRATEGY: Handle both Local DB (camelCase) and API (snake_case) structures

        // 1. Images
        // Local DB structure: roomGroup.images = [{ url: '...' }]
        if (roomGroup.images && roomGroup.images.length > 0) {
           roomGroup.images.forEach(img => {
             const url = typeof img === 'string' ? img : img.url;
             if (url) roomImages.push(url.replace('{size}', '170x154'));
           });
        }
        // API structure: roomGroup.images_ext = [{ url: '...' }]
        else if (roomGroup.images_ext && roomGroup.images_ext.length > 0) {
          roomGroup.images_ext.forEach(img => {
            if (img.url) roomImages.push(img.url.replace('{size}', '170x154'));
          });
        }

        // 2. Amenities
        // Local DB structure: roomGroup.roomAmenities = ['...']
        if (roomGroup.roomAmenities && roomGroup.roomAmenities.length > 0) {
           roomGroup.roomAmenities.forEach(amenity => {
             const name = typeof amenity === 'string' ? amenity : amenity.name;
             if (name) roomAmenities.push(name);
           });
        }
        // API structure: roomGroup.room_amenities or roomGroup.rg_ext.room_amenities
        else {
            const apiAmenities = roomGroup.room_amenities || roomGroup.rg_ext?.room_amenities;
            if (apiAmenities && apiAmenities.length > 0) {
              apiAmenities.forEach(amenity => {
                const name = typeof amenity === 'string' ? amenity : amenity.name;
                if (name) roomAmenities.push(name);
              });
            }
        }


        const normalizedName = normalizeRoomName(roomName);

        if (roomImages.length > 0) {
          roomImagesMap.set(normalizedName, roomImages);
        }

        if (roomAmenities.length > 0) {
          roomAmenitiesMap.set(normalizedName, roomAmenities);
        }
      });

      console.log(`   📸 Extracted images for ${roomImagesMap.size} room types`);
      console.log(`   🧹 Extracted amenities for ${roomAmenitiesMap.size} room types`);
    } else {
      console.log(`   ⚠️  No room_groups in static content`);
    }
    console.log(`   ⏱️ Room group processing: ${Date.now() - roomProcessStart}ms`);

    // Prepare context for margin rules
    // Map country code to name if needed (must match search results logic)
    const countryName = staticContent?.country || this.countryCodeMap[staticContent?.countryCode] || staticContent?.countryCode;

    const context = {
      country: countryName,
      city: staticContent?.city,
      starRating: staticContent?.starRating || hotelData.star_rating,
      checkInDate: checkin, // Add check-in date from params
      bookingValue: 0, // Placeholder
      customerType: params.customerType || 'b2c'
    };

    console.log(`   💡 Margin context: country="${countryName}", city="${staticContent?.city}", stars=${context.starRating}`);

    // OPTIMIZATION: Use cached rules from MarginService (avoids DB query if cached)
    const marginFetchStart = Date.now();
    const MarginRule = require('../models/MarginRule');
    const allRules = await MarginService.getCachedRules();
    console.log(`   ⏱️ Margin rules fetch: ${Date.now() - marginFetchStart}ms (${allRules.length} rules)`);

    // Extract rates with book_hash and detailed room data
    const rateProcessStart = Date.now();
    const rates = (hotelData.rates || []).map(rate => {
      const paymentType = rate.payment_options?.payment_types?.[0];

        // Check if free cancellation is available
      const isFreeCancellation = this.checkFreeCancellation(paymentType?.cancellation_penalties);

      // Extract free cancellation deadline
      let freeCancellationBefore = null;
      if (paymentType?.cancellation_penalties?.free_cancellation_before) {
        freeCancellationBefore = paymentType.cancellation_penalties.free_cancellation_before;
      }

      // Calculate total taxes for display (separate from base price)
      let totalTaxes = 0;
      let taxData = null;
      let includedTaxesTotal = 0;

      if (paymentType?.tax_data) {
        taxData = paymentType.tax_data;
        if (taxData.taxes && taxData.taxes.length > 0) {
           // Sum up all taxes
           totalTaxes = taxData.taxes.reduce((sum, tax) => sum + parseFloat(tax.amount || 0), 0);
           // Sum up included taxes
           includedTaxesTotal = taxData.taxes
             .filter(tax => tax.included_by_supplier)
             .reduce((sum, tax) => sum + parseFloat(tax.amount || 0), 0);
        }
      }

      // IMPORTANT: show_amount is the TOTAL for the ENTIRE stay, not per-night!
      // It equals the sum of daily_prices array
      const showAmount = parseFloat(paymentType?.show_amount || paymentType?.amount || 0);
      const totalStayPrice = showAmount - includedTaxesTotal;

      // Calculate per-night average for display purposes
      const numberOfNights = (rate.daily_prices || []).length || 1;
      const perNightPrice = totalStayPrice / numberOfNights;

      // Update context with rate specific values
      const rateContext = {
        ...context,
        bookingValue: totalStayPrice, // Use total for margin rules
        mealType: rate.meal // Add meal type for specific rules (e.g. breakfast included)
      };

      const matchingRule = MarginService.findMatchingRule(rateContext, allRules);

      const marginInfo = matchingRule ? {
        rule: matchingRule,
        marginType: matchingRule.type,
        marginValue: matchingRule.type === 'fixed' ? matchingRule.fixedAmount : matchingRule.value,
        isDefault: false
      } : {
        rule: null,
        marginType: 'percentage',
        marginValue: 0, // Default
        isDefault: true
      };

      // UPDATED: Apply margin to (total stay price + booking taxes) instead of just base price
      // This ensures margin is calculated on the total amount paid at booking time (rate + taxes included by supplier)
      const marginBase = totalStayPrice + includedTaxesTotal;
      const priceResult = MarginService.applyMargin(marginBase, marginInfo);

      // Debug log for first rate
      if (hotelData.rates.indexOf(rate) === 0) {
        console.log(`   💰 Rate margin: totalStay=${totalStayPrice}, bookingTaxes=${includedTaxesTotal}, marginBase=${marginBase} (${numberOfNights} nights), marginType=${marginInfo.marginType}, marginValue=${marginInfo.marginValue}`);
        console.log(`      Result: final=${priceResult.finalPrice}, marginAmount=${priceResult.marginAmount}, rule="${matchingRule?.name || 'Default'}"`);
      }



      // Fire and forget stats (optional, could be noisy)
      if (matchingRule) {
         MarginRule.updateOne({ _id: matchingRule._id }, { $inc: { appliedCount: 1 } }).catch(() => {});
      }

      // Apply the same margin percentage to BOOKING taxes only (NOT pay-at-hotel taxes)
      const marginMultiplier = marginBase > 0 ? priceResult.finalPrice / marginBase : 1;

      // Separate pay-at-hotel taxes (no margin) from booking taxes (margin applied)
      const payAtHotelTaxesTotal = taxData?.taxes
        ? taxData.taxes
            .filter(tax => !tax.included_by_supplier)
            .reduce((sum, tax) => sum + parseFloat(tax.amount || 0), 0)
        : 0;
      const bookingTaxesTotal = totalTaxes - payAtHotelTaxesTotal;
      // Display taxes = margin-adjusted booking taxes + original pay-at-hotel taxes
      const displayTaxes = (bookingTaxesTotal > 0 ? Math.round(bookingTaxesTotal * marginMultiplier) : 0) + Math.round(payAtHotelTaxesTotal);

      // Debug: Log tax transformation for first rate
      if (hotelData.rates.indexOf(rate) === 0) {
        console.log(`   🧾 Tax margin: marginMultiplier=${marginMultiplier.toFixed(4)}, originalTaxes=${totalTaxes}, bookingTaxes=${bookingTaxesTotal}, payAtHotelTaxes=${payAtHotelTaxesTotal}, displayTaxes=${displayTaxes}`);
        if (taxData?.taxes) {
          taxData.taxes.forEach(t => {
            const isPayAtHotel = !t.included_by_supplier;
            console.log(`      ${t.name}: $${t.amount} → $${isPayAtHotel ? t.amount + ' (pay-at-hotel, no margin)' : (parseFloat(t.amount) * marginMultiplier).toFixed(2)}`);
          });
        }
      }

      return {
        book_hash: rate.book_hash,
        match_hash: rate.match_hash,
        room_name: rate.room_name,
        meal: rate.meal,

        // IMPORTANT: Price is now the TOTAL for the ENTIRE STAY, not per-night!
        // Frontend should NOT multiply by nights - this is already the full amount
        price: priceResult.finalPrice, // Total stay price with margin
        price_per_night: priceResult.finalPrice / numberOfNights, // Average per night (for display)
        currency: paymentType?.show_currency_code || currency,
        original_price: totalStayPrice, // Store original total for comparison
        original_price_per_night: perNightPrice, // Original per-night average
        margin_applied: {
          ruleName: matchingRule?.name || 'Default',
          marginType: marginInfo.marginType,
          marginValue: marginInfo.marginValue,
          marginAmount: priceResult.marginAmount,
          marginPercentage: priceResult.marginPercentage,
          isDefault: marginInfo.isDefault
        },

        // Tax Data - ensure each tax has the correct currency AND margin applied (only to booking taxes)
        total_taxes: displayTaxes,
        taxes_currency: paymentType?.show_currency_code || currency,
        // Map taxes to use the correct currency for display AND apply margin ONLY to booking taxes
        tax_data: taxData ? (() => {
          const mappedTaxes = taxData.taxes?.map(tax => {
            const originalAmount = parseFloat(tax.amount || 0);
            const isPayAtHotel = !tax.included_by_supplier;
            // Only apply margin to booking taxes, NOT pay-at-hotel taxes
            const adjustedAmount = isPayAtHotel
              ? Math.round(originalAmount * 100) / 100
              : Math.round(originalAmount * marginMultiplier * 100) / 100;

            // Debug log for first rate
            if (hotelData.rates.indexOf(rate) === 0) {
              console.log(`      📊 Tax mapping: ${tax.name}: original=${originalAmount} → adjusted=${adjustedAmount} (${isPayAtHotel ? 'pay-at-hotel, NO margin' : `multiplier=${marginMultiplier.toFixed(4)}`})`);
            }

            return {
              ...tax,
              amount: adjustedAmount, // Return as number, not string
              currency: isPayAtHotel ? (tax.currency_code || tax.currency || paymentType?.currency_code || currency) : (paymentType?.currency_code || currency)
            };
          }) || [];

          return {
            ...taxData,
            taxes: mappedTaxes
          };
        })() : null,
        // Also provide a simplified taxes array with margin applied only to booking taxes
        taxes: taxData?.taxes?.map(tax => {
          const isPayAtHotel = !tax.included_by_supplier;
          return {
            name: tax.name,
            amount: isPayAtHotel
              ? Math.round(parseFloat(tax.amount || 0) * 100) / 100
              : Math.round(parseFloat(tax.amount || 0) * marginMultiplier * 100) / 100,
            currency: isPayAtHotel ? (tax.currency_code || tax.currency || paymentType?.currency_code || currency) : (paymentType?.currency_code || currency),
            included: tax.included_by_supplier || false
          };
        }) || [],

        // Policies
        is_free_cancellation: isFreeCancellation,
        free_cancellation_before: freeCancellationBefore,
        cancellation_penalties: paymentType?.cancellation_penalties, // Pass full struct for debugging
        requires_prepayment: paymentType?.is_need_credit_card_data || paymentType?.is_prepayment,
        payment_options: rate.payment_options,

        // Detailed room data
        room_data: rate.room_data || null,
        bed_groups: rate.room_data?.bed_groups || [],
        room_size: rate.room_data?.room_size || null,
        max_occupancy: rate.room_data?.max_occupancy || null,

        // Room amenities from Content API room_groups (with fuzzy matching)
        // FIX: Use English room name (via match_hash) for matching when language != 'en'
        room_amenities: (() => {
          const enRoomName = matchHashToEnName.get(rate.match_hash);
          const roomKey = normalizeRoomName(enRoomName || rate.room_name);
          let matchedAmenities = roomAmenitiesMap.get(roomKey);

          if (!matchedAmenities) {
            for (const [groupName, amenities] of roomAmenitiesMap.entries()) {
              if (roomKey.startsWith(groupName)) {
                matchedAmenities = amenities;
                break;
              }
            }
          }

          return matchedAmenities || rate.room_data?.room_amenities || [];
        })(),

        // Room images from Content API room_groups
        // FIX: Use English room name (via match_hash) for matching when language != 'en'
        room_images: (() => {
          const enRoomName = matchHashToEnName.get(rate.match_hash);
          const roomKey = normalizeRoomName(enRoomName || rate.room_name);
          let matchedImages = roomImagesMap.get(roomKey);

          if (!matchedImages) {
            for (const [groupName, imgs] of roomImagesMap.entries()) {
              if (roomKey.startsWith(groupName)) {
                matchedImages = imgs;
                break;
              }
            }
          }

          return matchedImages || (images.length > 0 ? [images[0].replace('1024x768', '170x154')] : []);
        })(),
        room_image_count: (() => {
          const enRoomName = matchHashToEnName.get(rate.match_hash);
          const roomKey = normalizeRoomName(enRoomName || rate.room_name);
          let matchedImages = roomImagesMap.get(roomKey);

          if (!matchedImages) {
            for (const [groupName, imgs] of roomImagesMap.entries()) {
              if (roomKey.startsWith(groupName)) {
                matchedImages = imgs;
                break;
              }
            }
          }

          return matchedImages ? matchedImages.length : 0;
        })(),

        // Meal data - construct from API's meal field
        // RateHawk meal values: 'nomeal', 'breakfast', 'halfboard', 'fullboard', 'allinclusive', etc.
        meal_data: (() => {
          const mealType = rate.meal || 'nomeal';
          const breakfastMeals = ['breakfast', 'halfboard', 'fullboard', 'allinclusive', 'halfboard-breakfast'];
          return {
            breakfast_included: breakfastMeals.some(m => mealType.toLowerCase().includes(m)),
            meal_type: mealType
          };
        })(),

        // Pricing with tax breakdown (Booking.com style: room price + taxes separately)
        // NOTE: We REMOVED the duplicate total_taxes, tax_data, taxes_currency here
        // because they were OVERWRITING the margin-adjusted values set above
        ...(() => {
          return {
            daily_prices: rate.daily_prices,
            // NOTE: price is already set above with margin applied (priceResult.finalPrice)
            // DO NOT override it here!
            // total_taxes, taxes_currency, and tax_data are also already set above with margin applied

            // Tax breakdown - only include vat_data which isn't margin-related
            vat_data: paymentType?.vat_data || null
          };
        })(),

        // Detailed cancellation policies
        cancellation_policies: paymentType?.cancellation_penalties,
        cancellation_details: (paymentType?.cancellation_penalties?.policies || []).map(policy => ({
          start_date: policy.start_at,
          end_date: policy.end_at,
          penalty_amount: parseFloat(policy.amount_charge || 0),
          penalty_show_amount: parseFloat(policy.amount_show || 0),
          currency: paymentType?.show_currency_code || currency
        })),
        free_cancellation_before: paymentType?.cancellation_penalties?.free_cancellation_before,
        is_free_cancellation: isFreeCancellation,

        // Payment details
        payment_type: paymentType?.type,
        requires_prepayment: paymentType?.type === 'now',
        requires_credit_card: paymentType?.is_need_credit_card_data || false,
        requires_cvc: paymentType?.is_need_cvc || false,

        // Room distinguishing attributes (smoking, accessible, bed type guarantee, etc.)
        amenities_data: rate.amenities_data || [],
        room_data_trans: rate.room_data_trans || null,

        // Legacy amenities field
        amenities: rate.amenities_data || []
      };
    });
    console.log(`   ⏱️ Rate processing (${rates.length} rates, margins+taxes): ${Date.now() - rateProcessStart}ms`);

    return {
      id: hotelData.id,
      hid: hotelData.hid,
      name: staticContent?.name || hotelData.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: staticContent?.description_struct?.[0]?.paragraphs?.join('\n\n') || '',
      address: staticContent?.address || '',
      city: staticContent?.region?.name || staticContent?.city || '',
      country: staticContent?.region?.country_name || staticContent?.country || '',
      countryCode: staticContent?.region?.country_code || staticContent?.countryCode || '',
      // Full region object for detailed location display (like Booking.com)
      region: staticContent?.region || null,
      coordinates: {
        latitude: staticContent?.latitude || 0,
        longitude: staticContent?.longitude || 0
      },
      images: images.length > 0 ? images : [`https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=${encodeURIComponent(hotelData.id.substring(0, 20))}`],
      mainImage: images[0] || `https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=${encodeURIComponent(hotelData.id.substring(0, 20))}`,
      star_rating: staticContent?.starRating || staticContent?.star_rating || 0,
      amenities: amenities,
      facts: staticContent?.facts || {},
      rates,
      check_in_time: staticContent?.checkInTime || staticContent?.check_in_time || '15:00',
      check_out_time: staticContent?.checkOutTime || staticContent?.check_out_time || '12:00',
      metapolicy_extra_info: staticContent?.metapolicyExtraInfo || staticContent?.metapolicy_extra_info || '',
      metapolicy_struct: staticContent?.metapolicyStruct || staticContent?.metapolicy_struct || null,
      policy_struct: staticContent?.policyStruct || staticContent?.policy_struct || null,
      // Review data from hotel_reviews collection
      rating: reviewData?.overall_rating || null,
      reviewScore: reviewData?.overall_rating || null,
      reviewCount: reviewData?.review_count || 0,
      detailed_ratings: reviewData?.detailed_ratings || null,
      reviews: (reviewData?.reviews || []).slice(0, 10), // Limit to 10 reviews for performance
      debug: response.debug,
      // Attach raw DB docs for route-level caching (not sent to frontend)
      _rawStaticContent: staticContent || null,
      _rawReviewData: reviewData || null
    };
  }

  /**
   * Prebook a rate to get book_hash (required before booking)
   * @param {string} matchHash - Match hash from search results
   * @param {string} language - Language code
   * @returns {Promise<Object>} - Prebook response with book_hash
   */
  async prebook(matchHash, language = 'en') {
    let attempts = 0;
    const maxAttempts = 2; // Try initially, then retry once if needed

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`🔄 Prebook request (Attempt ${attempts}/${maxAttempts}):`, { hash: matchHash, language });

        const response = await this.makeRequest('/hotel/prebook', 'POST', {
          hash: matchHash,
          language
        });

        console.log('📦 Prebook response:', JSON.stringify(response, null, 2));

        // CRITICAL STABILITY FIX: Retry on 'no_available_rates'
        // This error is often transient due to supplier timeout
        if (response.error === 'no_available_rates') {
          if (attempts < maxAttempts) {
            console.warn(`⚠️ Prebook failed with 'no_available_rates', retrying in 800ms...`);
            await this.sleep(800); // Wait slightly longer to allow supplier to recover
            continue;
          }
        }

        const hotelData = response.data?.hotels?.[0];
        const rateData = hotelData?.rates?.[0];

        if (!rateData?.book_hash) {
          console.error('❌ No book_hash in prebook response');
          return {
            success: false,
            error: response.error || 'No book_hash returned',
            data: response.data
          };
        }

        return {
          success: true,
          book_hash: rateData.book_hash,
          data: response.data
        };
      } catch (error) {
        console.error('❌ Prebook error:', error.response?.data || error.message);
        console.error('   Full error:', JSON.stringify(error.response?.data, null, 2));
        return {
          success: false,
          error: error.response?.data?.error || error.message
        };
      }
    }
  }

  /**
   * Create booking (final step after payment)
   * @param {string} bookHash - Book hash from prebook
   * @param {Object} bookingData - Booking information
   * @returns {Promise<Object>} - Booking confirmation
   */
  async createBooking(bookHash, bookingData) {
    const {
      partner_order_id,
      user_ip = '0.0.0.0',
      language = 'en'
    } = bookingData;

    try {
      const response = await this.makeRequest('/hotel/order/booking/form/', 'POST', {
        partner_order_id,
        book_hash: bookHash,
        language,
        user_ip
      });

      console.log('Create Booking Response:', JSON.stringify(response, null, 2));

      // Check for sandbox restriction in response body
      if (response.error === 'sandbox_restriction') {
        console.warn('⚠️ Sandbox restriction: Booking not created (production credentials required)');
        return {
          success: false,
          sandbox_mode: true,
          message: 'Booking simulation successful (sandbox mode)',
          partner_order_id
        };
      }

      return {
        success: true,
        order_id: response.data?.order_id,
        status: response.data?.status,
        data: response.data
      };
    } catch (error) {
      // Handle sandbox restriction in error response
      if (error.response?.data?.error === 'sandbox_restriction') {
        console.warn('⚠️ Sandbox restriction: Booking not created (production credentials required)');
        return {
          success: false,
          sandbox_mode: true,
          message: 'Booking simulation successful (sandbox mode)',
          partner_order_id
        };
      }
      throw error;
    }
  }

  /**
   * Start booking process (step 2 after createBooking)
   * @param {string} partnerOrderId - Partner order ID from step 1
   * @param {Object} bookingDetails - Guest and payment details
   * @returns {Promise<Object>} - Booking start response
   */
  async startBooking(partnerOrderId, bookingDetails) {
    const {
      user,           // { email, phone, comment? }
      rooms,          // [{ guests: [{ first_name, last_name }] }]
      language = 'en',
      payment_type,   // { type: 'deposit', amount, currency_code }
      supplier_data   // { first_name_original, last_name_original, phone?, email? }
    } = bookingDetails;

    // Build supplier_data - required per ETG Sandbox API
    const supplierData = supplier_data || {
      first_name_original: rooms?.[0]?.guests?.[0]?.first_name || 'Guest',
      last_name_original: rooms?.[0]?.guests?.[0]?.last_name || 'User',
      phone: user?.phone || '',
      email: user?.email || ''
    };

    try {
      const response = await this.makeRequest('/hotel/order/booking/finish/', 'POST', {
        partner: {
          partner_order_id: partnerOrderId,
          comment: user?.comment || '',
          amount_sell_b2b2c: '0'
        },
        user: {
          email: user?.email || '',
          phone: user?.phone || '',
          comment: user?.comment || ''
        },
        supplier_data: supplierData,
        language,
        rooms,
        payment_type
      });

      return {
        success: true,
        order_id: response.data?.order_id,
        status: response.data?.status,
        data: response.data
      };
    } catch (error) {
      console.error('Start booking error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Check booking status (step 3 - poll until complete)
   * @param {string} partnerOrderId - Partner order ID
   * @returns {Promise<Object>} - Booking status
   */
  async checkBookingStatus(partnerOrderId) {
    try {
      // Per ETG API docs: partner_order_id is sent directly, not nested in partner object
      const response = await this.makeRequest('/hotel/order/booking/finish/status/', 'POST', {
        partner_order_id: partnerOrderId
      });

      // Response structure: { data: { partner_order_id, percent, ... }, status: 'ok'|'processing'|'error', ... }
      // status field indicates booking progress: ok=success, processing=in progress, error=failed

      return {
        success: response.status === 'ok',
        status: response.status, // ok, processing, or error
        order_id: response.data?.order_id,
        partner_order_id: response.data?.partner_order_id,
        percent: response.data?.percent,
        error: response.error,
        data: response.data
      };
    } catch (error) {
      console.error('Check booking status error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get cancellation info for a booking
   * @param {string} partnerOrderId - Partner order ID
   * @returns {Promise<Object>} - Cancellation info including penalties
   */
  async getCancellationInfo(partnerOrderId) {
    try {
      console.log(`🔍 Getting cancellation info for order: ${partnerOrderId}`);

      const response = await this.makeRequest('/hotel/order/cancel/info/', 'POST', {
        partner_order_id: partnerOrderId
      });

      console.log('📋 Cancellation info response:', JSON.stringify(response, null, 2));

      if (response.error) {
        return {
          success: false,
          error: response.error,
          message: response.error_message || 'Failed to get cancellation info'
        };
      }

      // Parse cancellation penalties
      const penalties = response.data?.cancellation_penalties || {};
      const policies = penalties.policies || [];

      // Determine current applicable penalty
      const now = new Date();
      let currentPenalty = null;
      let isFreeCancellation = false;
      let freeCancellationBefore = penalties.free_cancellation_before;

      // Check if free cancellation is still available
      if (freeCancellationBefore) {
        const deadline = new Date(freeCancellationBefore);
        isFreeCancellation = deadline > now;
      }

      // Find the current applicable policy
      for (const policy of policies) {
        const startDate = new Date(policy.start_at);
        const endDate = policy.end_at ? new Date(policy.end_at) : null;

        if (startDate <= now && (!endDate || now < endDate)) {
          currentPenalty = {
            amount: parseFloat(policy.amount_charge || 0),
            showAmount: parseFloat(policy.amount_show || 0),
            currency: policy.currency_code || 'USD',
            percentage: parseFloat(policy.percent_charge || 0),
            startDate: policy.start_at,
            endDate: policy.end_at
          };
          break;
        }
      }

      return {
        success: true,
        partnerOrderId,
        orderId: response.data?.order_id,
        isFreeCancellation,
        freeCancellationBefore,
        currentPenalty,
        policies: policies.map(p => ({
          startAt: p.start_at,
          endAt: p.end_at,
          amountCharge: parseFloat(p.amount_charge || 0),
          amountShow: parseFloat(p.amount_show || 0),
          percentCharge: parseFloat(p.percent_charge || 0),
          currency: p.currency_code
        })),
        cancellable: response.data?.cancellable !== false,
        data: response.data
      };
    } catch (error) {
      console.error('Get cancellation info error:', error.response?.data || error.message);

      // Handle sandbox mode
      if (error.response?.data?.error === 'sandbox_restriction') {
        return {
          success: true,
          sandbox_mode: true,
          isFreeCancellation: true,
          currentPenalty: null,
          policies: [],
          cancellable: true,
          message: 'Sandbox mode: Free cancellation simulated'
        };
      }

      // Handle 404 - endpoint may not be available for this order
      if (error.response?.status === 404) {
        console.warn('⚠️ Cancellation info endpoint not found - assuming booking is cancellable');
        return {
          success: true,
          endpoint_not_available: true,
          isFreeCancellation: false, // Unknown, assume not free
          currentPenalty: null, // Unknown penalty
          policies: [],
          cancellable: true, // Assume cancellable
          message: 'Cancellation info not available - proceeding with cancellation'
        };
      }

      throw error;
    }
  }

  /**
   * Cancel a booking
   * @param {string} partnerOrderId - Partner order ID
   * @returns {Promise<Object>} - Cancellation result
   */
  async cancelBooking(partnerOrderId) {
    try {
      console.log(`🚫 Cancelling booking: ${partnerOrderId}`);

      // First, try to get cancellation info to check penalties (optional)
      let cancellationInfo;
      try {
        cancellationInfo = await this.getCancellationInfo(partnerOrderId);

        // Only block cancellation if explicitly marked as not cancellable
        if (cancellationInfo.cancellable === false) {
          return {
            success: false,
            error: 'not_cancellable',
            message: 'This booking cannot be cancelled'
          };
        }
      } catch (error) {
        // If cancellation info fails, proceed with cancellation anyway
        console.warn('⚠️ Could not get cancellation info, proceeding with cancellation attempt');
        cancellationInfo = {
          success: true,
          endpoint_not_available: true,
          currentPenalty: null
        };
      }

      // Proceed with cancellation
      const response = await this.makeRequest('/hotel/order/cancel/', 'POST', {
        partner_order_id: partnerOrderId
      });

      console.log('❌ Cancel booking response:', JSON.stringify(response, null, 2));

      // Check for order_not_found error
      if (response.error === 'order_not_found') {
        console.error('❌ Order not found in RateHawk system');
        return {
          success: false,
          error: 'order_not_found',
          message: 'Booking not found in provider system. It may have already been cancelled or was not fully confirmed.',
          partnerOrderId
        };
      }

      // Check for sandbox restriction
      if (response.error === 'sandbox_restriction') {
        console.warn('⚠️ Sandbox restriction: Cancellation simulated');
        return {
          success: true,
          sandbox_mode: true,
          message: 'Cancellation simulated (sandbox mode)',
          partnerOrderId,
          penalty: cancellationInfo.currentPenalty
        };
      }

      if (response.error) {
        return {
          success: false,
          error: response.error,
          message: response.error_message || 'Cancellation failed'
        };
      }

      return {
        success: true,
        partnerOrderId,
        orderId: response.data?.order_id,
        status: response.data?.status || 'cancelled',
        penalty: cancellationInfo.currentPenalty,
        refundAmount: response.data?.refund_amount,
        refundCurrency: response.data?.refund_currency,
        data: response.data
      };
    } catch (error) {
      console.error('Cancel booking error:', error.response?.data || error.message);

      // Handle sandbox mode error
      if (error.response?.data?.error === 'sandbox_restriction') {
        console.warn('⚠️ Sandbox restriction: Cancellation simulated');
        return {
          success: true,
          sandbox_mode: true,
          message: 'Cancellation simulated (sandbox mode)',
          partnerOrderId
        };
      }

      // Return error details instead of throwing
      return {
        success: false,
        error: error.response?.data?.error || 'cancellation_error',
        message: error.response?.data?.error_message || error.message,
        partnerOrderId
      };
    }
  }

  /**
   * Get formatted dates for API requests
   * @param {number} daysFromNow - Days from today for check-in
   * @param {number} nights - Number of nights
   * @returns {Object} - Formatted checkin and checkout dates
   */
  static getDefaultDates(daysFromNow = 30, nights = 3) {
    const today = new Date();
    const checkin = new Date(today);
    checkin.setDate(today.getDate() + daysFromNow);
    const checkout = new Date(checkin);
    checkout.setDate(checkin.getDate() + nights);

    const formatDate = (date) => date.toISOString().split('T')[0];

    return {
      checkin: formatDate(checkin),
      checkout: formatDate(checkout)
    };
  }

  /**
   * ========================================
   * POINTS OF INTEREST (POI) API METHODS
   * ========================================
   */

  /**
   * Get POI dump URL and metadata
   * Retrieves a dump with hotel POI data (nearby attractions, transit, etc.)
   *
   * @param {string} language - ISO 639-1 language code (e.g., 'en', 'ar')
   * @returns {Promise<Object>} - { url: string, last_update: Date }
   */
  async getPoiDump(language = 'en') {
    try {
      console.log(`📍 Requesting POI dump for language: ${language}`);

      const response = await this.makeRequest('/hotel/poi/dump/', 'POST', {
        language
      });

      if (response.error) {
        if (response.error === 'dump_not_ready') {
          console.warn('⚠️ POI dump is still processing. Try again later.');
          return {
            success: false,
            error: 'dump_not_ready',
            message: 'The dump is in processing. Try to send the request later.'
          };
        }
        throw new Error(response.error);
      }

      console.log(`✅ POI dump URL retrieved: ${response.data.url}`);
      console.log(`📅 Last updated: ${response.data.last_update}`);

      return {
        success: true,
        url: response.data.url,
        last_update: new Date(response.data.last_update),
        language
      };
    } catch (error) {
      console.error('❌ Error getting POI dump:', error.message);
      throw error;
    }
  }

  /**
   * ========================================
   * HOTEL REVIEWS API METHODS
   * ========================================
   */

  /**
   * Get hotel reviews dump URL and metadata
   * Retrieves a dump with all hotel reviews for a specific language
   * The dump should be updated weekly
   *
   * @param {string} language - ISO 639-1 language code (e.g., 'en', 'ar')
   * @returns {Promise<Object>} - { url: string, last_update: Date }
   */
  async getReviewsDump(language = 'en') {
    try {
      console.log(`📦 Requesting reviews dump for language: ${language}`);

      const response = await this.makeRequest('/hotel/reviews/dump/', 'POST', {
        language
      });

      if (response.error) {
        if (response.error === 'dump_not_ready') {
          console.warn('⚠️ Reviews dump is still processing. Try again later.');
          return {
            success: false,
            error: 'dump_not_ready',
            message: 'The dump is in processing. Try to send the request later.'
          };
        }
        throw new Error(response.error);
      }

      console.log(`✅ Reviews dump URL retrieved: ${response.data.url}`);
      console.log(`📅 Last updated: ${response.data.last_update}`);

      return {
        success: true,
        url: response.data.url,
        last_update: new Date(response.data.last_update),
        language
      };
    } catch (error) {
      console.error('❌ Error getting reviews dump:', error.message);
      throw error;
    }
  }

  /**
   * Get incremental hotel reviews dump
   * Contains only reviews added since the previous update
   * Should be updated weekly
   *
   * @param {string} language - ISO 639-1 language code (e.g., 'en', 'ar')
   * @returns {Promise<Object>} - { url: string, last_update: Date }
   */
  async getIncrementalReviewsDump(language = 'en') {
    try {
      console.log(`📦 Requesting incremental reviews dump for language: ${language}`);

      const response = await this.makeRequest('/hotel/incremental_reviews/dump/', 'POST', {
        language
      });

      if (response.error) {
        if (response.error === 'dump_not_ready') {
          console.warn('⚠️ Incremental reviews dump is still processing. Try again later.');
          return {
            success: false,
            error: 'dump_not_ready',
            message: 'The dump is in processing. Try to send the request later.'
          };
        }
        throw new Error(response.error);
      }

      console.log(`✅ Incremental reviews dump URL retrieved: ${response.data.url}`);
      console.log(`📅 Last updated: ${response.data.last_update}`);

      return {
        success: true,
        url: response.data.url,
        last_update: new Date(response.data.last_update),
        language,
        incremental: true
      };
    } catch (error) {
      console.error('❌ Error getting incremental reviews dump:', error.message);
      throw error;
    }
  }

  /**
   * Get hotel reviews by IDs (Content API)
   * Recommended approach for fetching reviews for specific hotels
   * Can use either HIDs (numeric) or IDs (string)
   *
   * @param {Array<number|string>} hotelIds - Array of hotel IDs (HIDs or IDs)
   * @param {string} language - ISO 639-1 language code (e.g., 'en', 'ar')
   * @param {string} idType - 'hids' or 'ids' (auto-detected if not specified)
   * @returns {Promise<Array>} - Array of hotel review objects
   */
  async getReviewsByIds(hotelIds, language = 'en', idType = null) {
    try {
      if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
        throw new Error('hotelIds must be a non-empty array');
      }

      // Auto-detect ID type if not specified
      if (!idType) {
        idType = typeof hotelIds[0] === 'number' || !isNaN(hotelIds[0]) ? 'hids' : 'ids';
      }

      console.log(`📖 Fetching reviews for ${hotelIds.length} hotels (${idType}), language: ${language}`);

      // Convert to appropriate format
      const payload = {
        language
      };

      if (idType === 'hids') {
        payload.hids = hotelIds.map(id => typeof id === 'number' ? id : parseInt(id));
      } else {
        payload.ids = hotelIds.map(id => String(id));
      }

      // Use Content API endpoint
      const contentApiUrl = 'https://api.worldota.net/api/content/v1';
      const response = await axios.post(
        `${contentApiUrl}/hotel_reviews_by_ids/`,
        payload,
        {
          auth: {
            username: this.keyId,
            password: this.apiKey
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const reviews = response.data.data || [];
      console.log(`✅ Fetched reviews for ${reviews.length} hotels`);

      // Transform data to include useful summary
      return reviews.map(hotel => ({
        hotel_id: hotel.id,
        hid: hotel.hid,
        language,
        reviews: hotel.reviews || [],
        review_count: hotel.reviews?.length || 0,
        average_rating: this.calculateAverageRating(hotel.reviews || []),
        source: 'content_api'
      }));
    } catch (error) {
      console.error('❌ Error fetching reviews by IDs:', error.message);
      throw error;
    }
  }

  /**
   * Calculate average rating from reviews array
   * @param {Array} reviews - Array of review objects
   * @returns {number} - Average rating (0-10 scale)
   */
  calculateAverageRating(reviews) {
    if (!reviews || reviews.length === 0) return 0;

    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    return parseFloat((totalRating / reviews.length).toFixed(2));
  }
}

module.exports = new RateHawkService();
