const express = require('express');
const { protect } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');
const rateHawkService = require('../utils/RateHawkService');

const jwt = require('jsonwebtoken'); // Added for optional auth
const User = require('../models/User'); // Added for user history
const router = express.Router();

// In-memory cache for hotel search results with longer TTL
let hotelSearchCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
 * Get personalized hotel suggestions
 * GET /api/hotels/suggested
 * Optional Query: location (for guest geolocation)
 * Optional Header: Authorization (for user history)
 */
router.get('/suggested', async (req, res) => {
  try {
    let destination = null;
    let source = 'fallback'; // history, location, fallback

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

    // Check cache first
    const cacheKey = `suggestions:${destination}`;
    const cachedData = getCachedResults(cacheKey);

    if (cachedData) {
      console.log(`♻️  Serving cached results for ${destination}`);
      return successResponse(res, cachedData, 'Suggestions retrieved from cache');
    }

    // Use existing search logic (simplified)
    // First suggest to get region/hotel ID
    let suggestions;
    let searchResults = { hotels: [] };

    try {
      suggestions = await rateHawkService.suggest(destination);

      if (suggestions.regions.length > 0 || suggestions.hotels.length > 0) {
        // Pick first region or hotel
        const target = suggestions.regions[0] || suggestions.hotels[0];
        const regionId = target.region_id || target.id;

        // Get dates (next weekend)
        const dates = rateHawkService.constructor.getDefaultDates(7, 3);

        // Search - smart enrichment leverages cache to serve more hotels
        // With cache, we can request more hotels without extra API calls
        searchResults = await rateHawkService.searchByRegion(regionId, {
          ...dates,
          adults: 2,
          enrichmentLimit: 20 // Increased base limit (cache multiplies this further)
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

    const responseData = {
      hotels: suggestedHotels,
      source,
      destination
    };

    // Cache the successful result
    setCachedResults(cacheKey, responseData);

    successResponse(res, responseData, 'Suggestions retrieved successfully');

  } catch (error) {
    console.error('Suggestions error:', error);
    errorResponse(res, 'Failed to get suggestions', 500);
  }
});

/**
 * Suggest hotels and regions worldwide (autocomplete)
 * GET /api/hotels/suggest?query=ewaa
 */
router.get('/suggest', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return errorResponse(res, 'Query must be at least 2 characters', 400);
    }

    console.log(`🔍 Worldwide hotel suggest for: "${query}"`);

    // Use RateHawk multicomplete API for worldwide search
    const results = await rateHawkService.suggest(query, 'en');

    // Format hotels for frontend
    const hotels = (results.hotels || []).map(hotel => ({
      id: hotel.id,
      hid: hotel.hid,
      name: hotel.label || hotel.id.replace(/_/g, ' ').toUpperCase(),
      type: hotel.type || 'hotel',
      location: hotel.location,
      coordinates: hotel.coordinates
    }));

    const regions = (results.regions || []).map(region => ({
      id: region.id,
      name: region.label,
      type: region.type,
      location: region.location
    }));

    console.log(`✅ Found ${hotels.length} hotels and ${regions.length} regions worldwide`);

    return successResponse(res, {
      hotels,
      regions
    }, 'Suggestions retrieved successfully');

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
    const {
      destination,
      checkin,
      checkout,
      adults = 2,
      children = 0,
      page = 1,
      limit = 20
    } = req.query;

    if (!destination) {
      return errorResponse(res, 'Destination is required', 400);
    }

    // Generate cache key (v3 = includes isSearchedHotel flag)
    const cacheKey = `v3_${destination}_${checkin}_${checkout}_${adults}_${children}`;

    // Check cache first
    if (hotelSearchCache.has(cacheKey)) {
      console.log(`📦 Returning cached results for: ${destination}`);
      const cached = hotelSearchCache.get(cacheKey);
      const pageNumber = parseInt(page) || 1;
      const limitNumber = parseInt(limit) || 20;
      const startIndex = (pageNumber - 1) * limitNumber;
      const endIndex = startIndex + limitNumber;

      return successResponse(res, {
        hotels: cached.hotels.slice(startIndex, endIndex),
        total: cached.hotels.length,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(cached.hotels.length / limitNumber),
        fromCache: true
      }, 'Hotels retrieved from cache');
    }

    // Use default dates if not provided
    let searchDates;
    if (checkin && checkout) {
      searchDates = { checkin, checkout };
    } else {
      searchDates = rateHawkService.constructor.getDefaultDates(30, 3);
    }

    // Step 1: Get region and hotel suggestions
    const suggestions = await rateHawkService.suggest(destination);

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

    if (hasHotels) {
      // If specific hotels found, use the first hotel's region
      regionToSearch = suggestions.hotels[0];
      console.log(`🏨 Searching by hotel: ${suggestions.hotels[0].name} (region_id: ${suggestions.hotels[0].region_id})`);
    } else {
      // Otherwise use the first region
      regionToSearch = suggestions.regions[0];
      console.log(`📍 Searching by region: ${suggestions.regions[0].name} (id: ${suggestions.regions[0].id})`);
    }

    // Step 3: Search hotels in the selected region
    const regionId = regionToSearch.region_id || regionToSearch.id;
    const searchResults = await rateHawkService.searchByRegion(regionId, {
      ...searchDates,
      adults: parseInt(adults) || 2,
      children: children ? (Array.isArray(children) ? children : []) : []
    });




    // If searching for a specific hotel (not a region), prioritize it but show other hotels too
    if (hasHotels && searchResults.hotels.length > 0) {
      const searchedHotelId = suggestions.hotels[0].id;
      const searchedHotelHid = suggestions.hotels[0].hid;

      // Find the searched hotel
      const matchedHotelIndex = searchResults.hotels.findIndex(hotel =>
        hotel.id === searchedHotelId || hotel.hid === searchedHotelHid
      );

      if (matchedHotelIndex !== -1) {
        const matchedHotel = searchResults.hotels[matchedHotelIndex];

        // If the matched hotel doesn't have location data, enrich it from Content API
        if (!matchedHotel.address || !matchedHotel.city) {
          console.log(`⚠️ Searched hotel missing location data, enriching from Content API...`);
          try {
            const contentResponse = await rateHawkService.makeRequest(
              '/content/v1/hotel_content_by_ids/',
              'POST',
              {
                hids: [matchedHotel.hid],
                language: 'en'
              },
              'https://api.worldota.net/api'
            );

            const hotelContent = contentResponse?.data?.[0];
            if (hotelContent) {
              matchedHotel.address = hotelContent.address || '';
              matchedHotel.city = hotelContent.region?.name || '';
              matchedHotel.country = hotelContent.region?.country_name || 'Saudi Arabia';
              console.log(`✅ Enriched searched hotel with location: ${matchedHotel.address}, ${matchedHotel.city}`);
            }
          } catch (err) {
            console.error('Error enriching searched hotel:', err.message);
          }
        }

        // Mark this as the searched hotel for frontend prioritization
        matchedHotel.isSearchedHotel = true;

        // Move the searched hotel to the front of the array
        searchResults.hotels.splice(matchedHotelIndex, 1);
        searchResults.hotels.unshift(matchedHotel);
        console.log(`✅ Found exact match for searched hotel: ${matchedHotel.name} (showing it first with ${searchResults.hotels.length - 1} other hotels)`);
      } else {
        console.log(`⚠️ Searched hotel not found in results with rates, will try to fetch from Content API and add it to the top`);
        // Don't clear the array - we'll add the searched hotel from Content API to the front
      }
    }



    // If searching for a specific hotel and it's not found in results, fetch hotel details from Booking API
    if (hasHotels && suggestions.hotels[0].hid) {
      const searchedHotelId = suggestions.hotels[0].id;
      const searchedHotelHid = suggestions.hotels[0].hid;

      // Check if the searched hotel is in the results
      const hotelFoundInResults = searchResults.hotels.some(hotel =>
        hotel.id === searchedHotelId || hotel.hid === searchedHotelHid
      );

      if (!hotelFoundInResults) {
        console.log(`⚠️ Searched hotel not in results, fetching from Booking API hotel info...`);
        try {
          // Use Booking API hotel info endpoint to get complete hotel information
          const hotelInfoResponse = await rateHawkService.makeRequest(
            '/hotel/info/',
            'POST',
            {
              hid: searchedHotelHid,
              language: 'en'
            }
          );

          const hotelContent = hotelInfoResponse?.data;

          if (hotelContent) {
            // Extract location information
            const address = hotelContent.address || '';
            const city = hotelContent.region?.name || '';
            const country = hotelContent.region?.country_code || '';

            console.log(`📍 Hotel location: ${address}, ${city}, ${country}`);

            // Process images - use images_ext if available for better quality, fallback to images array
            let hotelImages = [];
            console.log(`   🔍 Checking images...`);
            console.log(`   - images_ext exists: ${!!hotelContent.images_ext}, length: ${hotelContent.images_ext?.length || 0}`);
            console.log(`   - images exists: ${!!hotelContent.images}, length: ${hotelContent.images?.length || 0}`);

            if (hotelContent.images_ext && hotelContent.images_ext.length > 0) {
              console.log(`   - Using images_ext array`);
              hotelImages = hotelContent.images_ext.map(img =>
                img.url ? img.url.replace('{size}', '1024x768') : null
              ).filter(Boolean);
              console.log(`   - Processed ${hotelImages.length} images from images_ext`);
              if (hotelImages.length > 0) {
                console.log(`   - First image: ${hotelImages[0].substring(0, 80)}...`);
              }
            } else if (hotelContent.images && hotelContent.images.length > 0) {
              console.log(`   - Using images array`);
              hotelImages = hotelContent.images.map(img =>
                img ? img.replace('{size}', '1024x768') : null
              ).filter(Boolean);
              console.log(`   - Processed ${hotelImages.length} images from images`);
              if (hotelImages.length > 0) {
                console.log(`   - First image: ${hotelImages[0].substring(0, 80)}...`);
              }
            }

            if (hotelImages.length === 0) {
              console.log(`   ⚠️  NO IMAGES PROCESSED! Will use empty array.`);
            }

            // Format hotel data to match expected structure
            const formattedHotel = {
              id: hotelContent.id,
              hid: hotelContent.hid,
              name: hotelContent.name,
              address: address,
              city: city,
              country: country,
              rating: hotelContent.star_rating || 0,
              price: 0, // No rates available
              currency: 'SAR',
              images: hotelImages,
              image: hotelImages[0] || null,
              amenities: [],
              facilities: [],
              description: hotelContent.description_struct?.map(d => d.paragraphs?.join(' ')).join('\n\n') || '',
              rates: [],
              reviewScore: 0,
              reviewCount: 0,
              propertyClass: hotelContent.star_rating || 0,
              reviewScoreWord: null,
              isPreferred: false,
              checkIn: hotelContent.check_in_time || null,
              checkOut: hotelContent.check_out_time || null,
              coordinates: {
                latitude: hotelContent.latitude || 0,
                longitude: hotelContent.longitude || 0
              },
              noRatesAvailable: true,
              message: 'No rates available for selected dates. Try different dates or contact us for availability.'
            };

            // Extract amenities
            if (hotelContent.amenity_groups) {
              hotelContent.amenity_groups.forEach(group => {
                if (group.amenities) {
                  group.amenities.forEach(amenity => {
                    const amenityName = typeof amenity === 'string' ? amenity : amenity;
                    if (amenityName) {
                      formattedHotel.amenities.push(amenityName);
                      formattedHotel.facilities.push(amenityName);
                    }
                  });
                }
              });
            }

            // Add the searched hotel to the front of the results
            searchResults.hotels.unshift(formattedHotel);
            console.log(`✅ Hotel fetched from Booking API and added to top: ${formattedHotel.name} (total: ${searchResults.hotels.length} hotels)`);
            console.log(`   Images: ${formattedHotel.images.length}, Amenities: ${formattedHotel.amenities.length}`);
          }
        } catch (err) {
          console.error('Error fetching from Booking API:', err.message);
        }
      }
    }

    // Cache the results
    hotelSearchCache.set(cacheKey, {
      hotels: searchResults.hotels,
      timestamp: Date.now(),
      region: regionToSearch
    });

    // Auto-clear cache after 10 minutes
    setTimeout(() => {
      hotelSearchCache.delete(cacheKey);
    }, 10 * 60 * 1000);

    // Paginate results
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 20;
    const startIndex = (pageNumber - 1) * limitNumber;
    const endIndex = startIndex + limitNumber;

    successResponse(res, {
      hotels: searchResults.hotels.slice(startIndex, endIndex),
      total: searchResults.hotels.length,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(searchResults.hotels.length / limitNumber),
      region: regionToSearch.name || regionToSearch.region_name || 'Unknown',
      searchedHotel: hasHotels ? suggestions.hotels[0].name : null
    }, 'Hotels retrieved successfully');

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
    const { hid } = req.params;
    const {
      checkin,
      checkout,
      adults = 2,
      children = 0,
      match_hash
    } = req.query;

    // Validate hid
    const hotelId = parseInt(hid);
    if (!hotelId || isNaN(hotelId)) {
      return errorResponse(res, 'Invalid hotel ID. Must be a numeric value.', 400);
    }

    // Use default dates if not provided
    let searchDates;
    if (checkin && checkout) {
      searchDates = { checkin, checkout };
    } else {
      searchDates = rateHawkService.constructor.getDefaultDates(30, 3);
    }

    let hotelDetails;
    try {
      // Try to get hotel details with rates
      hotelDetails = await rateHawkService.getHotelDetails(hotelId, {
        ...searchDates,
        adults: parseInt(adults) || 2,
        children: children ? (Array.isArray(children) ? children : []) : [],
        match_hash
      });
    } catch (error) {
      // If hotel not found (no rates), fetch from Content API
      console.log(`⚠️ Hotel ${hotelId} not found with rates, fetching from Content API...`);

      try {
        const contentResponse = await rateHawkService.makeRequest(
          '/content/v1/hotel_content_by_ids/',
          'POST',
          {
            hids: [hotelId],
            language: 'en'
          },
          'https://api.worldota.net/api'
        );

        const hotelContent = contentResponse?.data?.[0];

        if (!hotelContent) {
          return errorResponse(res, 'Hotel not found', 404);
        }

        // Format hotel data from Content API
        hotelDetails = {
          id: hotelContent.id,
          hid: hotelContent.hid,
          name: hotelContent.name,
          address: hotelContent.address || '',
          city: hotelContent.region?.name || '',
          country: hotelContent.region?.country_name || '',
          star_rating: hotelContent.star_rating || 0,
          images: (hotelContent.images || []).map(img =>
            img.url ? img.url.replace('{size}', '1024x768') : null
          ).filter(Boolean),
          mainImage: hotelContent.images?.[0]?.url?.replace('{size}', '1024x768') || null,
          amenities: [],
          description: hotelContent.description_struct?.map(d => d.paragraphs?.join(' ')).join('\n\n') || '',
          coordinates: hotelContent.location || { latitude: 0, longitude: 0 },
          facts: hotelContent.facts || [],
          check_in_time: hotelContent.check_in_time || null,
          check_out_time: hotelContent.check_out_time || null,
          metapolicy_extra_info: hotelContent.metapolicy_extra_info || null,
          noRatesAvailable: true,
          message: 'No rates available for selected dates. Try different dates or contact us for availability.'
        };

        // Extract amenities
        if (hotelContent.amenity_groups) {
          hotelContent.amenity_groups.forEach(group => {
            if (group.amenities) {
              group.amenities.forEach(amenity => {
                const amenityName = typeof amenity === 'string' ? amenity : amenity.name;
                if (amenityName) {
                  hotelDetails.amenities.push(amenityName);
                }
              });
            }
          });
        }

        console.log(`✅ Hotel fetched from Content API: ${hotelDetails.name}`);
      } catch (contentError) {
        console.error('Error fetching from Content API:', contentError.message);
        return errorResponse(res, 'Hotel not found', 404);
      }
    }

    // Format response to match frontend expectations
    const formattedHotel = {
      id: hotelDetails.id,
      hid: hotelDetails.hid,
      name: hotelDetails.name,
      description: hotelDetails.description,
      address: hotelDetails.address,
      city: hotelDetails.city,
      country: hotelDetails.country,
      coordinates: hotelDetails.coordinates,
      images: hotelDetails.images,
      mainImage: hotelDetails.mainImage,
      star_rating: hotelDetails.star_rating,
      rating: hotelDetails.star_rating,
      amenities: hotelDetails.amenities,
      facts: hotelDetails.facts,
      rates: hotelDetails.rates,
      check_in_time: hotelDetails.check_in_time,
      check_out_time: hotelDetails.check_out_time,
      metapolicy_extra_info: hotelDetails.metapolicy_extra_info
    };

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

module.exports = router;
