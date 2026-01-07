const axios = require('axios');
require('dotenv').config();

/**
 * RateHawk API Service
 * Handles all interactions with the RateHawk (Emerging Travel Group) API
 */
class RateHawkService {
  constructor() {
    this.keyId = process.env.RATEHAWK_KEY_ID;
    this.apiKey = process.env.RATEHAWK_API_KEY;
    this.baseUrl = 'https://api.worldota.net/api/b2b/v3';

    // Cache for enriched hotel content (24 hour TTL)
    this.contentCache = new Map();
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
    this.staleCacheTTL = 7 * 24 * 60 * 60 * 1000; // 7 days for stale cache fallback

    // Cache for search results (shorter TTL for price freshness)
    this.searchCache = new Map();
    this.searchCacheTTL = 15 * 60 * 1000; // 15 minutes
    this.searchStaleCacheTTL = 6 * 60 * 60 * 1000; // 6 hours for stale search results

    // Rate limiting and circuit breaker
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.requestDelay = 200; // Minimum ms between requests (increased from 100ms)
    this.lastRequestTime = 0;

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
  }

  /**
   * Sleep utility for delays
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
   * Make authenticated request to RateHawk API with retry logic and rate limiting
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} data - Request payload
   * @param {string} customBaseUrl - Optional custom base URL (for Content API)
   * @param {number} retries - Number of retries left
   */
  async makeRequest(endpoint, method = 'POST', data = null, customBaseUrl = null, retries = 3) {
    // Rate limiting: Ensure minimum delay between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await this.sleep(this.requestDelay - timeSinceLastRequest);
    }
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
    const response = await this.makeRequest('/search/multicomplete/', 'POST', {
      query,
      language
    });

    return {
      regions: response.data?.regions || [],
      hotels: response.data?.hotels || []
    };
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
      residency = 'gb',
      language = 'en',
      currency = 'SAR',
      enrichmentLimit = 0 // Default 0 means no limit (enrich all)
    } = params;

    // Generate cache key for this search
    const cacheKey = this.generateSearchCacheKey(regionId, { checkin, checkout, adults, children, currency });
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
      const response = await this.makeRequest('/search/serp/region/', 'POST', {
        region_id: regionId,
        checkin,
        checkout,
        residency,
      language,
      guests: [
        {
          adults,
          children
        }
      ],
      currency
    });

      // Normalize response to match frontend expectations
    const hotels = (response.data?.hotels || []).map(hotel => {
      const firstRate = hotel.rates?.[0];
      const paymentType = firstRate?.payment_options?.payment_types?.[0];

      // Check for free cancellation and prepayment
      const paymentOptions = firstRate?.payment_options;
      const cancellationPenalties = firstRate?.cancellation_penalties;

      const isFreeCancellation = this.checkFreeCancellation(cancellationPenalties);
      const isNoPrepayment = paymentOptions?.payment_types?.some(pt => pt.is_need_credit_card_data === false) ||
                             paymentOptions?.pay_at_hotel === true;

      // Generate placeholder image (will be replaced with real images if available)
      const placeholderImage = `https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=${encodeURIComponent(hotel.id.substring(0, 20))}`;

      return {
        id: hotel.hid?.toString() || hotel.id, // Use hid as id for frontend compatibility
        hid: hotel.hid,
        hotelId: hotel.id, // Keep original ID for static content lookup
        name: hotel.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format ID as name fallback
        rating: firstRate?.rg_ext?.quality || 0,
        reviewScore: firstRate?.rg_ext?.quality || 0,
        price: paymentType?.show_amount || paymentType?.amount || 0,
        currency: paymentType?.show_currency_code || currency,
        image: placeholderImage,
        match_hash: firstRate?.match_hash,
        meal: firstRate?.meal,
        room_name: firstRate?.room_name,
        // Rate policies for filters
        free_cancellation: isFreeCancellation,
        no_prepayment: isNoPrepayment,
        payment_options: paymentOptions
      };
    });

    // Fetch images for ALL hotels using Content API (max 100 per request)
    let hotelHids = hotels.map(h => h.hid).filter(hid => hid);

    // Smart enrichment: Check cache first to determine actual API call needs
    let effectiveEnrichmentLimit = hotelHids.length;
    if (enrichmentLimit > 0) {
      const now = Date.now();
      const cachedCount = hotelHids.filter(hid => {
        const cached = this.contentCache.get(hid);
        return cached && (now - cached.timestamp) < this.cacheTTL;
      }).length;

      const uncachedCount = hotelHids.length - cachedCount;

      // Smart limit: cached hotels are "free", only limit uncached ones
      // If we want max 15 API calls, but have 10 cached, we can serve 10 + 15 = 25 total
      effectiveEnrichmentLimit = Math.min(hotelHids.length, cachedCount + enrichmentLimit);

      if (uncachedCount > enrichmentLimit) {
        console.log(`💡 Smart Enrichment: Serving ${effectiveEnrichmentLimit} hotels (${cachedCount} cached + ${enrichmentLimit} from Local DB)`);
        hotelHids = hotelHids.slice(0, effectiveEnrichmentLimit);
      } else if (cachedCount > 0) {
        console.log(`✨ Cache advantage: All ${hotelHids.length} hotels available (${cachedCount} cached, ${uncachedCount} new)`);
      } else {
        console.log(`📊 Enriching top ${enrichmentLimit} of ${hotelHids.length} hotels (0 cached)`);
        hotelHids = hotelHids.slice(0, enrichmentLimit);
      }
    }

    console.log(`📍 Fetching location data for ${hotelHids.length} hotels using Local DB`);

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

          // Split into batches of 100 to avoid huge DB queries (though Mongo handles thousands easily)
          const batchSize = 500;
          const batches = [];
          for (let i = 0; i < uncachedHids.length; i += batchSize) {
            batches.push(uncachedHids.slice(i, i + batchSize));
          }

          for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            try {
              // Query Local DB
              const localHotels = await HotelContent.find({ hid: { $in: batch } }).lean();
              console.log(`   ✅ Found ${localHotels.length}/${batch.length} hotels in local DB (Batch ${i+1})`);

              localHotels.forEach(hotel => {
                // Map local DB structure to match what the frontend expects
                let imageUrl = null;
                // Prioritize images array structure from local DB
                if (hotel.images && hotel.images.length > 0) {
                   const img = hotel.images[0];
                   imageUrl = (typeof img === 'string' ? img : img.url)?.replace('{size}', '640x400');
                } else if (hotel.mainImage) {
                   imageUrl = hotel.mainImage.replace('{size}', '640x400');
                }

                // Add to content map
                contentMap.set(hotel.hid, {
                  name: hotel.name,
                  address: hotel.address,
                  image: imageUrl, // Explicitly set single image for compatibility
                  images: imageUrl ? [imageUrl] : [],
                  star_rating: hotel.starRating,
                  kind: 'Hotel', // Default
                  hid: hotel.hid
                });

                // Update internal cache
                this.contentCache.set(hotel.hid, {
                });
              });
            } catch (error) {
              console.error(`   ⚠️ Batch ${i + 1} failed:`, error.message);

              // On rate limit (429), try to use stale cache as fallback
              if (error.response?.status === 429) {
                console.log(`⏰ Rate limit hit, checking for stale cache...`);
                batch.forEach(hid => {
                  const cached = this.contentCache.get(hid);
                  if (cached && (now - cached.timestamp) < this.staleCacheTTL) {
                    console.log(`   ✅ Using stale cache for HID ${hid} (${Math.round((now - cached.timestamp) / (1000 * 60 * 60))}h old)`);
                    contentMap.set(hid, cached.data);
                  }
                });
              }
            }
          }
        }

        console.log(`✅ Local DB returned ${contentMap.size} hotels with images`);

        // Update hotels with Content API data and mark enrichment status
        hotels.forEach(hotel => {
          const content = contentMap.get(hotel.hid);
          if (content) {
            if (content.image) hotel.image = content.image;
            if (content.name) hotel.name = content.name;
            if (content.address) hotel.address = content.address;
            if (content.city) hotel.city = content.city;
            if (content.country) hotel.country = content.country;
            // star_rating = hotel stars (1-5) from Content API
            // rating = review score (1-10) from Search API - keep it unchanged!
            if (content.star_rating) hotel.star_rating = content.star_rating;

            // Add amenities to the hotel object
            if (content.amenities) hotel.amenities = content.amenities;
            if (content.facilities) hotel.facilities = content.facilities;

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

    const result = {
      hotels,
      total: hotels.length,
      debug: response.debug
    };

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
      residency = 'gb',
      language = 'en',
      currency = 'SAR',
      match_hash = null
    } = params;

    const payload = {
      hid,
      checkin,
      checkout,
      residency,
      language,
      guests: [
        {
          adults,
          children
        }
      ],
      currency
    };

    // Include match_hash if provided (for rate matching)
    if (match_hash) {
      payload.match_hash = match_hash;
    }

    // Get pricing and availability
    const response = await this.makeRequest('/search/hp/', 'POST', payload);

    const hotelData = response.data?.hotels?.[0];
    if (!hotelData) {
      throw new Error('Hotel not found');
    }

    // Get static content (images, descriptions, amenities) from local database
    let staticContent = null;
    try {
      console.log(`📚 Fetching content for hotel ID: ${hotelData.id}, HID: ${hotelData.hid} from Local DB`);

      // Try local DB first (ETG Certification Requirement)
      const HotelContent = require('../models/HotelContent');
      staticContent = await HotelContent.findOne({ hid: hotelData.hid }).lean();

      if (staticContent) {
        console.log(`✅ Found local content for ${staticContent.name}`);
        // Map local DB content to expected API format if necessary
        // The import script saves it in a structure very similar to the API response
      } else {
        console.log(`⚠️ No local content found for HID: ${hotelData.hid}`);
        // Optional: Fallback to API if really needed, but for certification we want to rely on dump
        // const infoResponse = await this.makeRequest('/hotel/info/', 'POST', {
        //   hid: hotelData.hid,
        //   language
        // });
        // staticContent = infoResponse?.data;
      }

      if (staticContent) {
        console.log(`   Hotel name: ${staticContent.name}`);
        console.log(`   Address: ${staticContent.address || 'NOT FOUND'}`);
        console.log(`   Images: ${staticContent.images?.length || 0}`);
      }
    } catch (error) {
      console.error('❌ Could not fetch static content:', error.message);
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

    console.log(`📊 Extracted: ${images.length} images, ${amenities.length} amenities`);

    // Extract room images and amenities from room_groups
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
          console.log(`      ✅ ${roomName} → "${normalizedName}": ${roomImages.length} images`);
        }

        if (roomAmenities.length > 0) {
          roomAmenitiesMap.set(normalizedName, roomAmenities);
          console.log(`      🧹 ${roomName} → "${normalizedName}": ${roomAmenities.length} amenities`);
        }
      });

      console.log(`   📸 Extracted images for ${roomImagesMap.size} room types`);
      console.log(`   🧹 Extracted amenities for ${roomAmenitiesMap.size} room types`);
    } else {
      console.log(`   ⚠️  No room_groups in static content`);
    }

    // Extract rates with book_hash and detailed room data
    const rates = (hotelData.rates || []).map(rate => {
      const paymentType = rate.payment_options?.payment_types?.[0];

      // Check if free cancellation is available
      const isFreeCancellation = this.checkFreeCancellation(paymentType?.cancellation_penalties);

      return {
        book_hash: rate.book_hash,
        match_hash: rate.match_hash,
        room_name: rate.room_name,
        meal: rate.meal,

        // Detailed room data
        room_data: rate.room_data || null,
        bed_groups: rate.room_data?.bed_groups || [],
        room_size: rate.room_data?.room_size || null,
        max_occupancy: rate.room_data?.max_occupancy || null,

        // Room amenities from Content API room_groups (with fuzzy matching)
        room_amenities: (() => {
          const roomKey = normalizeRoomName(rate.room_name);
          let matchedAmenities = roomAmenitiesMap.get(roomKey);

          // Fuzzy matching fallback: try to find a room group that this rate starts with
          if (!matchedAmenities) {
            for (const [groupName, amenities] of roomAmenitiesMap.entries()) {
              if (roomKey.startsWith(groupName)) {
                matchedAmenities = amenities;
                console.log(`      🔍 Fuzzy matched amenities: "${rate.room_name}" → "${groupName}" (${amenities.length} amenities)`);
                break;
              }
            }
          }

          // Fallback to rate.room_data.room_amenities if still no match
          return matchedAmenities || rate.room_data?.room_amenities || [];
        })(),

        // Room images from Content API room_groups
        room_images: (() => {
          const roomKey = normalizeRoomName(rate.room_name);
          let matchedImages = roomImagesMap.get(roomKey);

          // Fuzzy matching fallback: try to find a room group that this rate starts with
          if (!matchedImages) {
            for (const [groupName, imgs] of roomImagesMap.entries()) {
              if (roomKey.startsWith(groupName)) {
                matchedImages = imgs;
                console.log(`      🔍 Fuzzy matched: "${rate.room_name}" → "${groupName}" (${imgs.length} images)`);
                break;
              }
            }
          }

          // Debug logging for exact matches or no matches
          if (!matchedImages) {
            console.log(`      ⚠️  No match for rate: "${rate.room_name}" → "${roomKey}"`);
          } else if (roomImagesMap.get(roomKey)) {
            console.log(`      ✅ Exact match: "${rate.room_name}" → "${roomKey}" (${matchedImages.length} images)`);
          }

          // Fallback to hotel images if no room-specific images
          return matchedImages || (images.length > 0 ? [images[0].replace('1024x768', '170x154')] : []);
        })(),
        room_image_count: (() => {
          const roomKey = normalizeRoomName(rate.room_name);
          let matchedImages = roomImagesMap.get(roomKey);

          // Fuzzy matching fallback
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

        // Pricing with tax breakdown
        daily_prices: rate.daily_prices,
        price: paymentType?.show_amount || paymentType?.amount,
        original_price: paymentType?.amount, // For showing discounts
        currency: paymentType?.show_currency_code || currency,

        // Tax breakdown
        tax_data: paymentType?.tax_data || null,
        taxes: (paymentType?.tax_data?.taxes || []).map(tax => ({
          name: tax.name,
          amount: parseFloat(tax.amount),
          currency: tax.currency_code,
          included: tax.included_by_supplier || false
        })),
        vat_data: paymentType?.vat_data || null,

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

        // Legacy amenities field
        amenities: rate.amenities_data || []
      };
    });

    return {
      id: hotelData.id,
      hid: hotelData.hid,
      name: staticContent?.name || hotelData.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: staticContent?.description_struct?.[0]?.paragraphs?.join('\n\n') || '',
      address: staticContent?.address || '',
      city: staticContent?.region?.name || '',
      // Country removed - Content API doesn't return correct country data
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
      debug: response.debug
    };
  }

  /**
   * Prebook a rate to get book_hash (required before booking)
   * @param {string} matchHash - Match hash from search results
   * @param {string} language - Language code
   * @returns {Promise<Object>} - Prebook response with book_hash
   */
  async prebook(matchHash, language = 'en') {
    try {
      console.log('🔄 Prebook request:', { hash: matchHash, language });

      const response = await this.makeRequest('/hotel/prebook', 'POST', {
        hash: matchHash,
        language
      });

      console.log('📦 Prebook response:', JSON.stringify(response, null, 2));

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
}

module.exports = new RateHawkService();
