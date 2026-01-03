const axios = require('axios');

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

    if (!this.keyId || !this.apiKey) {
      console.warn('⚠️ RateHawk credentials not configured. Set RATEHAWK_KEY_ID and RATEHAWK_API_KEY in .env');
    }
  }

  /**
   * Make authenticated request to RateHawk API
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} data - Request payload
   * @param {string} customBaseUrl - Optional custom base URL (for Content API)
   */
  async makeRequest(endpoint, method = 'POST', data = null, customBaseUrl = null) {
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
      return response.data;
    } catch (error) {
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
   * Search hotels by region
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
        room_name: firstRate?.room_name
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
        console.log(`💡 Smart Enrichment: Serving ${effectiveEnrichmentLimit} hotels (${cachedCount} cached + ${enrichmentLimit} new API calls)`);
        hotelHids = hotelHids.slice(0, effectiveEnrichmentLimit);
      } else if (cachedCount > 0) {
        console.log(`✨ Cache advantage: All ${hotelHids.length} hotels available (${cachedCount} cached, ${uncachedCount} new)`);
      } else {
        console.log(`📊 Enriching top ${enrichmentLimit} of ${hotelHids.length} hotels (0 cached)`);
        hotelHids = hotelHids.slice(0, enrichmentLimit);
      }
    }

    console.log(`📍 Fetching location data for ${hotelHids.length} hotels using Content API`);

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
          // Split into batches of 100 (API limit)
          const batchSize = 100;
          const batches = [];
          for (let i = 0; i < uncachedHids.length; i += batchSize) {
            batches.push(uncachedHids.slice(i, i + batchSize));
          }

          console.log(`   Processing ${batches.length} batch(es) of hotels`);

          // Fetch all batches in parallel
          const batchPromises = batches.map(async (batch, index) => {
            try {
              console.log(`   Fetching batch ${index + 1}/${batches.length} (${batch.length} hotels)`);
              const response = await this.makeRequest('/content/v1/hotel_content_by_ids/', 'POST', {
                hids: batch,
                language
              }, 'https://api.worldota.net/api');
              return response.data || [];
            } catch (error) {
              console.error(`   ⚠️ Batch ${index + 1} failed:`, error.message);
              return [];
            }
          });

          const batchResults = await Promise.all(batchPromises);

          // Combine all batch results
          const allHotels = batchResults.flat();

          allHotels.forEach(hotel => {
            // Extract image URL - prefer images_ext, fallback to images
            let imageUrl = null;
            if (hotel.images_ext && hotel.images_ext.length > 0) {
              imageUrl = hotel.images_ext[0].url?.replace('{size}', '640x400');
            } else if (hotel.images && hotel.images.length > 0) {
              imageUrl = hotel.images[0]?.url?.replace('{size}', '640x400');
            }

            const hotelData = {
              image: imageUrl,
              name: hotel.name,
              address: hotel.address || '',
              city: hotel.region?.name || '',
              country: hotel.region?.country_code || 'SA',
              star_rating: hotel.star_rating
            };

            contentMap.set(hotel.hid, hotelData);

            // Cache the enriched data for future use
            this.contentCache.set(hotel.hid, {
              data: hotelData,
              timestamp: Date.now()
            });
          });
        }

        console.log(`✅ Content API returned ${contentMap.size} hotels with images`);

        // Update hotels with Content API data and mark enrichment status
        hotels.forEach(hotel => {
          const content = contentMap.get(hotel.hid);
          if (content) {
            if (content.image) hotel.image = content.image;
            if (content.name) hotel.name = content.name;
            if (content.address) hotel.address = content.address;
            if (content.city) hotel.city = content.city;
            if (content.country) hotel.country = content.country;
            if (content.star_rating) hotel.rating = content.star_rating;
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

    return {
      hotels,
      total: hotels.length,
      debug: response.debug
    };
  }

  /**
   * Check if a rate has free cancellation
   * @param {Object} cancellationPenalties - Cancellation penalties object
   * @returns {boolean} - True if free cancellation is available
   */
  checkFreeCancellation(cancellationPenalties) {
    if (!cancellationPenalties || !cancellationPenalties.policies) {
      return false;
    }

    // Check if there's at least one policy with no penalty
    return cancellationPenalties.policies.some(policy =>
      policy.amount_charge === 0 || policy.amount_charge === null
    );
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

    // Get static content (images, descriptions, amenities) using Booking API hotel info
    let staticContent = null;
    try {
      console.log(`📚 Fetching content for hotel ID: ${hotelData.id}, HID: ${hotelData.hid}`);

      // Use Booking API hotel info endpoint
      const infoResponse = await this.makeRequest('/hotel/info/', 'POST', {
        hid: hotelData.hid,
        language
      });

      console.log(`✅ Booking API hotel info response received`);
      staticContent = infoResponse?.data;

      if (staticContent) {
        console.log(`   Hotel name: ${staticContent.name}`);
        console.log(`   Address: ${staticContent.address || 'NOT FOUND'}`);
        console.log(`   Region: ${staticContent.region?.name || 'NOT FOUND'}`);
        console.log(`   Country: ${staticContent.region?.country_code || 'NOT FOUND'}`);
        console.log(`   Images: ${staticContent.images?.length || 0}`);
        console.log(`   Images_ext: ${staticContent.images_ext?.length || 0}`);
        console.log(`   Description: ${staticContent.description_struct?.length || 0} paragraphs`);
      } else {
        console.log(`   ⚠️ Static content is null!`);
      }
    } catch (error) {
      console.error('❌ Could not fetch static content:', error.message);
      console.error('   Status:', error.response?.status);
    }

    // Extract images from Booking API hotel info response
    const images = [];

    // Prefer images_ext (has category info), fallback to images array
    if (staticContent?.images_ext && staticContent.images_ext.length > 0) {
      console.log(`   📷 Using images_ext array (${staticContent.images_ext.length} images)`);
      staticContent.images_ext.forEach(img => {
        if (img.url) {
          const imageUrl = img.url.replace('{size}', '1024x768');
          images.push(imageUrl);
        }
      });
    } else if (staticContent?.images && staticContent.images.length > 0) {
      console.log(`   📷 Using images array (${staticContent.images.length} images)`);
      staticContent.images.forEach(img => {
        if (img) {
          const imageUrl = typeof img === 'string' ? img.replace('{size}', '1024x768') : img;
          images.push(imageUrl);
        }
      });
    }

    console.log(`   ✅ Extracted ${images.length} images total`);

    // Extract amenities from Content API response
    const amenities = [];
    if (staticContent?.amenity_groups) {
      console.log(`   Amenity groups found: ${staticContent.amenity_groups.length}`);
      staticContent.amenity_groups.forEach(group => {
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
    } else {
      console.log(`   ⚠️ No amenity_groups in static content`);
    }

    console.log(`📊 Extracted: ${images.length} images, ${amenities.length} amenities`);

    // Extract room images from room_groups
    const roomImagesMap = new Map();
    if (staticContent?.room_groups && staticContent.room_groups.length > 0) {
      console.log(`   🛏️  Processing ${staticContent.room_groups.length} room groups for images`);

      // Helper function to normalize room names for matching
      const normalizeRoomName = (name) => {
        if (!name) return '';
        return name
          .toLowerCase()
          .replace(/[()]/g, '')     // Remove parentheses but keep content
          .replace(/\s+/g, ' ')     // Normalize whitespace
          .trim();
      };

      staticContent.room_groups.forEach(roomGroup => {
        const roomName = roomGroup.name || roomGroup.rg_ext?.name;
        if (!roomName) return;

        const roomImages = [];

        // Extract images from images_ext (preferred)
        if (roomGroup.images_ext && roomGroup.images_ext.length > 0) {
          roomGroup.images_ext.forEach(img => {
            if (img.url) {
              // Use 170x154 for thumbnails (crop)
              const imageUrl = img.url.replace('{size}', '170x154');
              roomImages.push(imageUrl);
            }
          });
        }

        if (roomImages.length > 0) {
          const normalizedName = normalizeRoomName(roomName);
          roomImagesMap.set(normalizedName, roomImages);
          console.log(`      ✅ ${roomName} → "${normalizedName}": ${roomImages.length} images`);
        }
      });

      console.log(`   📸 Extracted images for ${roomImagesMap.size} room types`);
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
        room_amenities: rate.room_data?.room_amenities || [],

        // Room images from Content API room_groups
        room_images: (() => {
          const normalizeRoomName = (name) => {
            if (!name) return '';
            return name
              .toLowerCase()
              .replace(/[()]/g, '')     // Remove parentheses but keep content
              .replace(/\s+/g, ' ')     // Normalize whitespace
              .trim();
          };
          const roomKey = normalizeRoomName(rate.room_name);
          let matchedImages = roomImagesMap.get(roomKey);

          // Fuzzy matching fallback: try to find a room group that this rate starts with
          if (!matchedImages) {
            for (const [groupName, images] of roomImagesMap.entries()) {
              if (roomKey.startsWith(groupName)) {
                matchedImages = images;
                console.log(`      🔍 Fuzzy matched: "${rate.room_name}" → "${groupName}" (${images.length} images)`);
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
          const normalizeRoomName = (name) => {
            if (!name) return '';
            return name
              .toLowerCase()
              .replace(/[()]/g, '')     // Remove parentheses but keep content
              .replace(/\s+/g, ' ')
              .trim();
          };
          const roomKey = normalizeRoomName(rate.room_name);
          let matchedImages = roomImagesMap.get(roomKey);

          // Fuzzy matching fallback
          if (!matchedImages) {
            for (const [groupName, images] of roomImagesMap.entries()) {
              if (roomKey.startsWith(groupName)) {
                matchedImages = images;
                break;
              }
            }
          }

          return matchedImages ? matchedImages.length : 0;
        })(),

        // Meal data
        meal_data: rate.meal_data || null,

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
      star_rating: staticContent?.star_rating || 0,
      amenities: amenities,
      facts: staticContent?.facts || {},
      rates,
      check_in_time: staticContent?.check_in_time || '15:00',
      check_out_time: staticContent?.check_out_time || '12:00',
      metapolicy_extra_info: staticContent?.metapolicy_extra_info || '',
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
      const response = await this.makeRequest('/hotel/prebook', 'POST', {
        hash: matchHash,
        language
      });

      const hotelData = response.data?.hotels?.[0];
      const rateData = hotelData?.rates?.[0];

      return {
        success: true,
        book_hash: rateData?.book_hash,
        data: response.data
      };
    } catch (error) {
      console.error('Prebook error:', error.response?.data || error.message);
      throw error;
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
      user,
      rooms,
      language = 'en',
      payment_type = { type: 'now' }
    } = bookingDetails;

    try {
      const response = await this.makeRequest('/hotel/order/booking/finish/', 'POST', {
        partner: {
          partner_order_id: partnerOrderId
        },
        user: {
          email: user.email,
          phone: user.phone || ''
        },
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
      const response = await this.makeRequest('/hotel/order/booking/finish/status/', 'POST', {
        partner: {
          partner_order_id: partnerOrderId
        }
      });

      // makeRequest returns response.data, so response IS the body
      // Structure: { data: { status: 'confirmed', ... }, status: 'ok', ... }

      return {
        success: true,
        status: response.data?.status, // Actual booking status (confirmed/failed/pending)
        order_id: response.data?.order_id,
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
