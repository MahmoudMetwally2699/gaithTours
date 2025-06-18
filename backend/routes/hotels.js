const express = require('express');
const axios = require('axios');
const { protect } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// In-memory cache for hotel search results (temporary solution)
let hotelSearchCache = new Map();

// Search hotels - simplified to only require destination (no authentication required)
router.get('/search', async (req, res) => {
  try {
    const { destination, page = 1, limit = 10 } = req.query;

    if (!destination) {
      return errorResponse(res, 'Destination is required', 400);
    }

    // Parse pagination parameters
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;
    const maxLimit = 50; // Maximum hotels per request
    const actualLimit = Math.min(limitNumber, maxLimit);

    // Generate default dates (today + 1 day for check-in, today + 2 days for check-out)
    const today = new Date();
    const defaultCheckIn = new Date(today);
    defaultCheckIn.setDate(today.getDate() + 1);
    const defaultCheckOut = new Date(today);
    defaultCheckOut.setDate(today.getDate() + 2);

    // Format dates to YYYY-MM-DD format
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    const arrivalDate = formatDate(defaultCheckIn);
    const departureDate = formatDate(defaultCheckOut);
    const adults = 1; // Default to 1 adult

    console.log('Hotel search request:', {
      destination,
      checkIn: arrivalDate,
      checkOut: departureDate,
      adults,
      page: pageNumber,
      limit: actualLimit
    });// Step 1: Search for destinations to get dest_id
    const destinationOptions = {
      method: 'GET',
      url: `https://${process.env.RAPIDAPI_HOST}/api/v1/hotels/searchDestination`,
      params: {
        query: destination
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': process.env.RAPIDAPI_HOST
      }
    };

    console.log('Searching destinations with options:', destinationOptions);
    const destinationResponse = await axios.request(destinationOptions);
    console.log('Destination response:', destinationResponse.data);    if (!destinationResponse.data.status || !destinationResponse.data.data || destinationResponse.data.data.length === 0) {
      return successResponse(res, {
        hotels: [],
        total: 0,
        page: 0
      }, 'No destinations found for the given query');
    }    // Get all destinations (cities, regions, etc.) for comprehensive search
    const destinations = destinationResponse.data.data;
    console.log(`Found ${destinations.length} destinations:`, destinations.map(d => ({ name: d.name, type: d.dest_type, hotels: d.hotels || d.nr_hotels })));    // Sort destinations to prioritize exact matches first, then broader areas
    const sortedDestinations = destinations.sort((a, b) => {
      // First, check for exact name matches with search destination
      const aExactMatch = a.name.toLowerCase().includes(destination.toLowerCase());
      const bExactMatch = b.name.toLowerCase().includes(destination.toLowerCase());

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // If both are exact matches or neither are, prioritize by type
      // Priority order: city > district > region > hotel (unless searching for specific hotel)
      const isHotelSearch = destination.toLowerCase().includes('hotel') || destination.toLowerCase().includes('فندق');

      if (isHotelSearch) {
        // When searching for hotels, prioritize hotel matches first
        const priorityOrder = { 'hotel': 1, 'city': 2, 'district': 3, 'region': 4 };
        const aPriority = priorityOrder[a.dest_type] || 5;
        const bPriority = priorityOrder[b.dest_type] || 5;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
      } else {
        // Normal search, prioritize broader areas
        const priorityOrder = { 'city': 1, 'district': 2, 'region': 3, 'hotel': 4 };
        const aPriority = priorityOrder[a.dest_type] || 5;
        const bPriority = priorityOrder[b.dest_type] || 5;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
      }

      // If same type, prioritize by number of hotels (more hotels first)
      const aHotels = a.hotels || a.nr_hotels || 0;
      const bHotels = b.hotels || b.nr_hotels || 0;
      return bHotels - aHotels;
    });

    console.log(`Sorted destinations:`, sortedDestinations.slice(0, 5).map(d => ({ name: d.name, type: d.dest_type, hotels: d.hotels || d.nr_hotels })));    let allHotels = [];
    let totalCount = 0;    // Identify if this is a search for specific hotels, including exact name matching
    // This will detect searches like "ewaa" that are looking for specific hotels
    const isHotelSearch = destination.toLowerCase().includes('hotel') ||
                          destination.toLowerCase().includes('فندق') ||
                          sortedDestinations.some(dest =>
                            dest.dest_type === 'hotel' &&
                            dest.name.toLowerCase().includes(destination.toLowerCase())
                          );    // For hotel searches, allow processing more destinations to get all matching hotels
    let maxDestinations = 3; // default
    if (isHotelSearch) {
      // Count how many matching hotel destinations we have
      const matchingHotelCount = sortedDestinations.filter(dest =>
        dest.dest_type === 'hotel' &&
        dest.name.toLowerCase().includes(destination.toLowerCase().replace(/hotel/g, '').trim())
      ).length;
      maxDestinations = Math.min(8, Math.max(5, matchingHotelCount)); // Optimized: between 5-8 destinations max
      console.log(`🚀 Hotel search detected: processing ${maxDestinations} destinations (${matchingHotelCount} matching hotels found)`);
    }

    let hotelsCollected = 0;
    const targetHotels = actualLimit;

    // For hotel searches, first collect all exact matching hotel destinations
    let exactMatchHotels = [];
    if (isHotelSearch) {
      const exactMatchDestinations = sortedDestinations.filter(dest =>
        dest.dest_type === 'hotel' &&
        dest.name.toLowerCase().includes(destination.toLowerCase().replace(/hotel/g, '').trim())
      );

      console.log(`Found ${exactMatchDestinations.length} exact matching hotel destinations`);

      // Process all exact matches first
      for (const exactDest of exactMatchDestinations.slice(0, 10)) { // Limit to 10 exact matches
        console.log(`Processing exact match: ${exactDest.name}`);
        // We'll collect these in the main loop but ensure they're prioritized
      }
    }    // Step 2: Fetch hotels from multiple destinations with pagination control
    for (let destIndex = 0; destIndex < Math.min(sortedDestinations.length, maxDestinations); destIndex++) {
      const destinationData = sortedDestinations[destIndex];
      const destId = destinationData.dest_id;

      console.log(`\n=== Searching destination ${destIndex + 1}/${Math.min(sortedDestinations.length, maxDestinations)}: ${destinationData.name} (${destinationData.hotels || destinationData.nr_hotels} hotels) ===`);      console.log(`Destination type: "${destinationData.dest_type}", Hotels: ${destinationData.hotels || destinationData.nr_hotels || 0}`);      // For hotel searches, check if this is a matching hotel destination
      let isMatchingHotel = isHotelSearch &&
        destinationData.dest_type === 'hotel' &&
        destinationData.name.toLowerCase().includes(destination.toLowerCase().replace(/hotel/g, '').trim());

      // For hotel searches: ALWAYS process ALL matching hotel destinations
      // For regular searches: stop when target is reached
      if (!isHotelSearch && hotelsCollected >= targetHotels) {
        console.log(`Regular search: stopping at ${hotelsCollected}/${targetHotels} hotels`);
        break;
      }

      // For hotel searches with matching hotels: NEVER stop, process all matching destinations
      if (isHotelSearch && isMatchingHotel) {
        console.log(`Hotel search: Processing matching hotel destination regardless of count: ${destinationData.name}`);
      }      // For hotel searches with non-matching destinations: stop when target reached
      else if (isHotelSearch && !isMatchingHotel && hotelsCollected >= targetHotels) {
        console.log(`Hotel search: skipping non-matching destination, already have ${hotelsCollected}/${targetHotels} hotels`);
        continue; // Skip this destination but continue to others
      }

      // Special handling for Ewaa hotels or similar exact name matches
      if (isHotelSearch && destination.toLowerCase() === 'ewaa') {
        const isEwaaHotel = destinationData.name.toLowerCase().includes('ewaa');
        if (isEwaaHotel) {
          console.log(`Special handling for Ewaa hotel: ${destinationData.name}`);
          isMatchingHotel = true; // Force process this hotel
        }
      }      // Skip destinations with very few hotels, BUT be more lenient for hotel searches
      const hotelCount = destinationData.hotels || destinationData.nr_hotels || 0;

      // For hotel searches, prioritize exact matches and skip non-matching destinations after first few
      if (isHotelSearch && !isMatchingHotel && destIndex > 2 && hotelsCollected > 0) {
        console.log(`⏭️  Skipping non-matching destination ${destIndex + 1}: ${destinationData.name} (already have ${hotelsCollected} hotels)`);
        continue;
      }

      if (hotelCount < 5) {
        // For cities and districts, be more lenient (allow even 1-2 hotels)
        if (['city', 'district'].includes(destinationData.dest_type)) {
          console.log(`Allowing ${destinationData.dest_type} with ${hotelCount} hotels: ${destinationData.name}`);
        }
        // For hotel searches, include individual hotels that match
        else if (isHotelSearch && destinationData.dest_type === 'hotel') {
          console.log(`Including hotel match: ${destinationData.name}`);
        }
        // For individual hotels in general search, only include if we need more results
        else if (destinationData.dest_type === 'hotel' && hotelsCollected < targetHotels / 2) {
          console.log(`Including individual hotel: ${destinationData.name}`);
        }
        // For other types with few hotels, skip
        else {
          console.log(`Skipping ${destinationData.name} - too few hotels (${hotelCount}) for type: ${destinationData.dest_type}`);
          continue;
        }
      }

      console.log(`✅ Processing destination: ${destinationData.name} (Type: ${destinationData.dest_type})`);      // Fetch hotels from this destination
      // For matching hotels, we want to get all pages
      // For non-matching hotels, stop when we reach the target
      const continueForMatching = isHotelSearch && isMatchingHotel;

      for (let page = 1; page <= 2 && (continueForMatching || hotelsCollected < targetHotels); page++) {
        // CRITICAL FIX: Use correct search_type based on destination type
        let searchType = 'city'; // default
        if (destinationData.dest_type === 'hotel') {
          searchType = 'hotel';
        } else if (destinationData.dest_type === 'city') {
          searchType = 'city';
        } else if (destinationData.dest_type === 'district') {
          searchType = 'district';
        }

        console.log(`Using search_type: "${searchType}" for dest_type: "${destinationData.dest_type}"`);

        const hotelOptions = {
          method: 'GET',
          url: `https://${process.env.RAPIDAPI_HOST}/api/v1/hotels/searchHotels`,
          params: {
            dest_id: destId,
            search_type: searchType,
            arrival_date: arrivalDate,
            departure_date: departureDate,
            adults: adults,
            children: 0,
            room_qty: 1,
            page_number: String(page),
            languagecode: 'en-us',
            currency_code: 'SAR'
          },
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': process.env.RAPIDAPI_HOST
          },
          timeout: 8000 // Reduced timeout to 8 seconds for faster responses
        };

        try {
          console.log(`Searching hotels page ${page} (collected: ${hotelsCollected}/${targetHotels})`);
          const hotelResponse = await axios.request(hotelOptions);

          console.log(`Hotel API response page ${page}:`, {
            status: hotelResponse.data.status,
            message: hotelResponse.data.message,
            hotelsCount: hotelResponse.data.data?.hotels?.length || 0
          });

          // Check if the hotel search was successful
          if (!hotelResponse.data.status) {
            console.error(`Hotel search failed on page ${page}:`, hotelResponse.data);
            if (page === 1) {
              // If first page fails, try next destination
              break;
            }
            break; // Stop fetching more pages if current page fails
          }

          // Check if hotels data exists
          if (!hotelResponse.data.data || !hotelResponse.data.data.hotels || hotelResponse.data.data.hotels.length === 0) {
            console.log(`No hotels found in response data for page ${page}`);
            break; // No more hotels to fetch
          }          // Transform the hotels from this page
          let pageHotels = hotelResponse.data.data.hotels.map(hotel => {
            const property = hotel.property || {};            // Get the best available photo URL - prioritize higher resolution
            let photoUrl = null;
            if (property.photoUrls && property.photoUrls.length > 0) {
              // Try to find a higher resolution URL by replacing 'square60' with higher res versions
              const originalUrl = property.photoUrls[0];

              // Replace low-res patterns with high-res ones
              if (originalUrl.includes('square60')) {
                // Try max1280 first, then max750, then max500
                photoUrl = originalUrl.replace('square60', 'max1280');
              } else if (originalUrl.includes('square180')) {
                photoUrl = originalUrl.replace('square180', 'max1280');
              } else {
                photoUrl = originalUrl;
              }

              console.log(`Image URL transformation: ${originalUrl} -> ${photoUrl}`);
            }return {
              id: hotel.hotel_id || property.id,
              name: property.name || 'Hotel Name Not Available',
              address: property.address || property.name || `${destinationData.name} Area` || 'Address not available',
              city: property.wishlistName || destinationData.city_name || '',
              country: property.countryCode || destinationData.country || '',rating: property.reviewScore || 0,
              image: photoUrl,
              coordinates: {
                latitude: property.latitude || destinationData.latitude || 0,
                longitude: property.longitude || destinationData.longitude || 0
              },
              description: hotel.accessibilityLabel || property.name || '',
              reviewScore: property.reviewScore || 0,
              reviewCount: property.reviewCount || 0,
              facilities: [],
              propertyClass: property.propertyClass || property.accuratePropertyClass || 0,
              reviewScoreWord: property.reviewScoreWord || null,
              isPreferred: property.isPreferred || false,
              checkIn: property.checkin || null,
              checkOut: property.checkout || null
            };
          });

          // If this is a specific hotel search and we're processing a hotel-type destination,
          // filter to only include hotels that match the search term more closely
          if (isHotelSearch && destinationData.dest_type === 'hotel') {
            const searchTerms = destination.toLowerCase().replace(/hotel/g, '').trim().split(' ');
            const exactMatchHotels = pageHotels.filter(hotel => {
              const hotelNameLower = hotel.name.toLowerCase();
              return searchTerms.some(term => term && hotelNameLower.includes(term));
            });

            if (exactMatchHotels.length > 0) {
              console.log(`Filtered to ${exactMatchHotels.length} exact matches from ${pageHotels.length} total hotels`);
              pageHotels = exactMatchHotels;
            }
          }          // Only take what we need to reach our target, unless it's an exact hotel match
          let hotelsToAdd;
          if (isHotelSearch && destinationData.dest_type === 'hotel' && isMatchingHotel) {
            // For exact hotel matches, take all matching hotels regardless of limit
            hotelsToAdd = pageHotels;
            console.log(`Taking all ${pageHotels.length} hotels from exact match: ${destinationData.name}`);
          } else {
            // For other searches, respect the remaining slots
            const remainingSlots = Math.max(0, targetHotels - hotelsCollected);
            hotelsToAdd = pageHotels.slice(0, remainingSlots);
          }

          allHotels = allHotels.concat(hotelsToAdd);
          hotelsCollected += hotelsToAdd.length;
          totalCount = hotelResponse.data.data?.total_count || allHotels.length;

          console.log(`Page ${page}: Found ${pageHotels.length} hotels, Added ${hotelsToAdd.length}, Total: ${hotelsCollected}/${targetHotels}`);          // For hotel searches with exact matches, always continue
          // For other searches, stop when we've collected enough hotels
          if (hotelsCollected >= targetHotels && !(isHotelSearch && isMatchingHotel)) {
            console.log(`✅ Target reached: ${hotelsCollected}/${targetHotels} hotels collected`);
            break;
          }

          // For exact hotel matches, log but continue to next destination
          if (isHotelSearch && isMatchingHotel) {
            console.log(`🔍 Exact hotel match found: ${destinationData.name}. Continuing to process additional matching hotels.`);
          }

          // For exact hotel matches, always continue to get the specific hotel
          if (isHotelSearch && destinationData.dest_type === 'hotel' && isMatchingHotel) {
            console.log(`Continuing hotel search for exact match: ${destinationData.name}`);
            break; // Break from pages loop but continue to next destination
          }

          // Stop if this page has fewer than 20 hotels (no more results)
          if (pageHotels.length < 20) {
            console.log(`Last page reached (${pageHotels.length} < 20 hotels)`);
            break;
          }          // Reduced delay between requests for faster response
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error fetching page ${page} for destination ${destinationData.name}:`, error.message);
          if (page === 1) {
            // If first page fails, try next destination
            break;
          }
          break; // Stop fetching more pages if current page fails
        }
      }      // Log completion for this destination
      console.log(`=== Completed destination ${destIndex + 1}: ${destinationData.name} ===`);

      // For hotel searches: always continue if we haven't processed all matching hotel destinations
      // For regular searches: stop when we hit the target hotel count
      if (isHotelSearch) {
        // Check if there are more matching hotel destinations to process
        const remainingMatchingHotels = sortedDestinations.slice(destIndex + 1).some(dest =>
          dest.dest_type === 'hotel' &&
          dest.name.toLowerCase().includes(destination.toLowerCase().replace(/hotel/g, '').trim())
        );

        if (remainingMatchingHotels) {
          console.log(`Hotel search: Continuing to process remaining matching hotels (collected: ${hotelsCollected})`);
          continue;
        }
      }

      // For regular searches or if no more matching hotels, stop when target is reached
      if (hotelsCollected >= targetHotels) {
        if (isHotelSearch) {
          console.log(`Hotel search: All matching hotels processed, stopping with ${hotelsCollected} hotels`);
        } else {
          console.log(`Regular search: Target reached, stopping at ${hotelsCollected}/${targetHotels} hotels`);
        }
        break;
      }
    }

    console.log('Final transformed hotels:', allHotels.length);

    // Remove duplicates based on hotel ID
    const uniqueHotels = allHotels.filter((hotel, index, self) =>
      index === self.findIndex(h => h.id === hotel.id)
    );    console.log(`Removed ${allHotels.length - uniqueHotels.length} duplicate hotels`);

    // Sort hotels to prioritize those matching the search destination
    const sortedHotels = uniqueHotels.sort((a, b) => {
      const destLower = destination.toLowerCase();
      const aNameLower = a.name.toLowerCase();
      const bNameLower = b.name.toLowerCase();

      // Calculate match scores for both hotels
      const aExactMatch = aNameLower === destLower ? 1000 : 0;
      const bExactMatch = bNameLower === destLower ? 1000 : 0;

      const aStartsWith = aNameLower.startsWith(destLower) ? 100 : 0;
      const bStartsWith = bNameLower.startsWith(destLower) ? 100 : 0;

      const aContains = aNameLower.includes(destLower) ? 50 : 0;
      const bContains = bNameLower.includes(destLower) ? 50 : 0;

      // Add bonus for word matches (split by spaces and check each word)
      const destWords = destLower.split(/\s+/);
      const aWordMatches = destWords.filter(word => aNameLower.includes(word)).length * 10;
      const bWordMatches = destWords.filter(word => bNameLower.includes(word)).length * 10;

      const aScore = aExactMatch + aStartsWith + aContains + aWordMatches + a.rating;
      const bScore = bExactMatch + bStartsWith + bContains + bWordMatches + b.rating;

      return bScore - aScore; // Higher score first
    });

    console.log(`Sorted hotels: ${sortedHotels.slice(0, 5).map(h => h.name).join(', ')}`);    // Implement pagination on the final sorted results
    const startIndex = (pageNumber - 1) * actualLimit;
    const endIndex = startIndex + actualLimit;
    const paginatedHotels = sortedHotels.slice(startIndex, endIndex);

    // Cache the search results for use in hotel details fallback
    hotelSearchCache.set(destination.toLowerCase(), sortedHotels);

    // Keep cache size reasonable (max 50 entries)
    if (hotelSearchCache.size > 50) {
      const firstKey = hotelSearchCache.keys().next().value;
      hotelSearchCache.delete(firstKey);
    }

    successResponse(res, {
      hotels: paginatedHotels,
      total: sortedHotels.length,
      page: pageNumber,
      limit: actualLimit,
      totalPages: Math.ceil(sortedHotels.length / actualLimit),
      destinationsSearched: Math.min(destinations.length, maxDestinations),
      totalDestinationsFound: destinations.length
    }, `Hotels retrieved successfully (page ${pageNumber}, ${paginatedHotels.length} hotels of ${sortedHotels.length} total)`);
  } catch (error) {
    console.error('Hotel search error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        params: error.config?.params
      }
    });

    if (error.response?.status === 401) {
      return errorResponse(res, 'Invalid API key or authentication failed', 401);
    } else if (error.response?.status === 429) {
      return errorResponse(res, 'API rate limit exceeded. Please try again later.', 429);
    } else if (error.response?.status === 400) {
      return errorResponse(res, 'Invalid search parameters. Please check your search criteria.', 400);
    }

    errorResponse(res, 'Failed to search hotels', 500);
  }
});

// Get hotel details by ID with fallback to search data
router.get('/details/:hotelId', protect, async (req, res) => {
  try {
    const { hotelId } = req.params;

    console.log(`Getting hotel details for ID: ${hotelId}`);

    // First, try to get detailed information from the hotel details API
    let hotelDetails = null;
    let hasDetailedData = false;

    try {
      // Generate default dates for the API call
      const today = new Date();
      const defaultCheckIn = new Date(today);
      defaultCheckIn.setDate(today.getDate() + 1);
      const defaultCheckOut = new Date(today);
      defaultCheckOut.setDate(today.getDate() + 2);

      // Format dates to YYYY-MM-DD format
      const formatDate = (date) => {
        return date.toISOString().split('T')[0];
      };

      const arrivalDate = formatDate(defaultCheckIn);
      const departureDate = formatDate(defaultCheckOut);

      const options = {
        method: 'GET',
        url: `https://${process.env.RAPIDAPI_HOST}/api/v1/hotels/getHotelDetails`,
        params: {
          hotel_id: hotelId,
          arrival_date: arrivalDate,
          departure_date: departureDate,
          languagecode: 'en-us'
        },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
        },
        timeout: 5000
      };

      const response = await axios.request(options);
      const hotel = response.data.data || response.data;

      console.log('Raw hotel details response:', JSON.stringify(hotel, null, 2));      // Check if we got meaningful data
      if (hotel && (hotel.hotel_name || hotel.name || hotel.rawData?.name)) {
        // Extract data from both direct hotel object and rawData
        const rawData = hotel.rawData || {};
        const roomData = hotel.rooms ? Object.values(hotel.rooms)[0] : {};        // Extract images from photos array with high resolution priority
        const imageUrls = [];
        if (hotel.photos && Array.isArray(hotel.photos)) {
          // Use only the highest resolution available: prioritize url_original and url_max1280
          hotel.photos.forEach(photo => {
            // Only use high resolution images (avoid low-res urls)
            const highResUrl = photo.url_original || photo.url_max1280;
            if (highResUrl) {
              imageUrls.push(highResUrl);
            }
          });
        }        if (rawData.photoUrls && Array.isArray(rawData.photoUrls)) {
          // Process rawData photoUrls and upgrade to higher resolution if needed
          rawData.photoUrls.forEach(photoUrl => {
            let highResUrl = photoUrl;
            if (photoUrl.includes('square60')) {
              highResUrl = photoUrl.replace('square60', 'max1280');
            } else if (photoUrl.includes('square180')) {
              highResUrl = photoUrl.replace('square180', 'max1280');
            }
            if (highResUrl) {
              imageUrls.push(highResUrl);
            }
          });
        }
        // Also check for room photos
        if (roomData.photos && Array.isArray(roomData.photos)) {
          roomData.photos.forEach(photo => {
            const highResUrl = photo.url_original || photo.url_max1280 || photo.url_max750 || photo.url_max300;
            if (highResUrl) {
              imageUrls.push(highResUrl);
            }
          });
        }

        // Get facilities from multiple sources
        const facilities = [];
        if (hotel.facilities_block?.facilities) {
          facilities.push(...hotel.facilities_block.facilities.map(f => f.name));
        }
        if (hotel.top_ufi_benefits) {
          facilities.push(...hotel.top_ufi_benefits.map(f => f.translated_name));
        }
        if (roomData.facilities) {
          facilities.push(...roomData.facilities.map(f => f.name));
        }

        hotelDetails = {
          id: hotel.hotel_id || hotel.id || rawData.id || hotelId,
          name: hotel.hotel_name || hotel.name || rawData.name,
          address: hotel.address || hotel.hotel_name || hotel.name,
          city: hotel.city || rawData.wishlistName || '',
          country: hotel.country || rawData.countryCode || 'Saudi Arabia',
          rating: rawData.reviewScore || hotel.review_score || hotel.rating || 0,
          reviewScore: rawData.reviewScore || hotel.review_score || hotel.rating || 0,
          reviewCount: rawData.reviewCount || hotel.review_count || 0,
          reviewScoreWord: rawData.reviewScoreWord || hotel.review_score_word || null,          images: imageUrls.filter(Boolean), // Remove any null/undefined URLs
          mainImage: imageUrls.length > 0 ? imageUrls[0] : (hotel.main_photo_url || null), // Use first high-res image
          coordinates: {
            latitude: rawData.latitude || hotel.latitude || hotel.lat || 0,
            longitude: rawData.longitude || hotel.longitude || hotel.lng || 0
          },
          description: hotel.description || hotel.hotel_name || hotel.name || '',
          facilities: [...new Set(facilities)], // Remove duplicates
          checkInTime: rawData.checkin?.fromTime || hotel.checkin?.from || hotel.check_in_time || '15:00',
          checkOutTime: rawData.checkout?.untilTime || hotel.checkout?.until || hotel.check_out_time || '11:00',
          propertyClass: rawData.propertyClass || rawData.accuratePropertyClass || 0        };        hasDetailedData = true;
        console.log('Successfully retrieved detailed hotel data with rating:', hotelDetails.rating, 'and', hotelDetails.images.length, 'images');
        console.log('Main image URL:', hotelDetails.mainImage);
        console.log('First 3 image URLs:', hotelDetails.images.slice(0, 3));
        console.log('All image URLs for debugging:', hotelDetails.images);
      }
    } catch (detailsError) {
      console.log('Hotel details API failed, will use fallback:', detailsError.message);
    }

    // If we don't have detailed data, check our search cache for this hotel
    if (!hasDetailedData) {
      console.log('Attempting to find hotel in search cache...');

      // Look for this hotel in our search cache
      let foundHotel = null;
      for (const [cacheKey, cachedHotels] of hotelSearchCache.entries()) {
        const hotel = cachedHotels.find(h => h.id === hotelId);
        if (hotel) {
          foundHotel = hotel;
          console.log(`Found hotel in cache from search: ${cacheKey}`);
          break;
        }
      }      if (foundHotel) {
        // Upgrade image URL to higher resolution if needed
        let upgradeImageUrl = foundHotel.image;
        if (upgradeImageUrl && upgradeImageUrl.includes('square60')) {
          upgradeImageUrl = upgradeImageUrl.replace('square60', 'max1280');
        } else if (upgradeImageUrl && upgradeImageUrl.includes('square180')) {
          upgradeImageUrl = upgradeImageUrl.replace('square180', 'max1280');
        }

        hotelDetails = {
          id: foundHotel.id,
          name: foundHotel.name,
          address: foundHotel.address,
          city: foundHotel.city,
          country: foundHotel.country,
          rating: foundHotel.rating || foundHotel.reviewScore || 0,
          reviewScore: foundHotel.reviewScore || foundHotel.rating || 0,
          reviewCount: foundHotel.reviewCount || 0,
          images: upgradeImageUrl ? [upgradeImageUrl] : [],
          mainImage: upgradeImageUrl,
          coordinates: foundHotel.coordinates || { latitude: 0, longitude: 0 },
          description: foundHotel.description || foundHotel.name,
          facilities: foundHotel.facilities || [],
          checkInTime: foundHotel.checkIn || '15:00',
          checkOutTime: foundHotel.checkOut || '11:00',
          propertyClass: foundHotel.propertyClass || 0,
          reviewScoreWord: foundHotel.reviewScoreWord || null,
          isPreferred: foundHotel.isPreferred || false
        };
        console.log('Using cached search data for hotel details with rating:', foundHotel.rating);
      }
    }    // If we still don't have hotel details, create a fallback with basic info
    if (!hotelDetails) {
      console.log('No hotel data found in API or cache, creating fallback data');

      // Create basic hotel details with the ID
      hotelDetails = {
        id: hotelId,
        name: `Hotel ${hotelId}`,
        address: 'Address not available',
        city: 'City not available',
        country: 'Saudi Arabia',
        rating: 0,
        images: [],
        mainImage: null,
        coordinates: {
          latitude: 0,
          longitude: 0
        },
        description: `Hotel details for ID ${hotelId}`,
        facilities: [],
        checkInTime: '15:00',
        checkOutTime: '11:00'
      };

      console.log('Using fallback data for hotel details');
    }

    successResponse(res, { hotel: hotelDetails }, 'Hotel details retrieved successfully');

  } catch (error) {
    console.error('Hotel details error:', error);

    if (error.response?.status === 404) {
      return errorResponse(res, 'Hotel not found', 404);
    }

    errorResponse(res, 'Failed to get hotel details', 500);
  }
});

// Get hotels by location (for autocomplete)
router.get('/locations', protect, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return errorResponse(res, 'Query must be at least 2 characters long', 400);
    }

    const options = {
      method: 'GET',
      url: `https://${process.env.RAPIDAPI_HOST}/api/v1/hotels/searchDestination`,
      params: {
        query: query
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
      }
    };

    const response = await axios.request(options);

    const locations = response.data.data?.map(location => ({
      id: location.dest_id,
      name: location.name,
      label: location.label,
      country: location.country,
      type: location.dest_type,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude
      }
    })) || [];

    successResponse(res, { locations }, 'Locations retrieved successfully');

  } catch (error) {
    console.error('Location search error:', error);
    errorResponse(res, 'Failed to search locations', 500);
  }
});

// Get popular destinations
router.get('/popular', async (req, res) => {
  try {
    // Popular destinations to search for
    const popularCities = ['Dubai', 'Paris', 'Tokyo', 'New York', 'London', 'Maldives'];
    const destinations = [];

    // Get real data for each popular destination
    for (const city of popularCities) {
      try {
        const options = {
          method: 'GET',
          url: `https://${process.env.RAPIDAPI_HOST}/api/v1/hotels/searchDestination`,
          params: {
            query: city
          },
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
          }
        };

        const response = await axios.request(options);

        if (response.data.status && response.data.data && response.data.data.length > 0) {
          const destination = response.data.data[0]; // Get the first/most relevant result
          destinations.push({
            id: destination.dest_id,
            name: destination.name,
            label: destination.label,
            country: destination.country,
            image: destination.image_url,
            hotels: destination.hotels || destination.nr_hotels,
            coordinates: {
              latitude: destination.latitude,
              longitude: destination.longitude
            },
            dest_type: destination.dest_type
          });
        }
      } catch (error) {
        console.error(`Failed to fetch data for ${city}:`, error.message);
        // Continue with other cities even if one fails
      }
    }

    // If no destinations were fetched, return an error
    if (destinations.length === 0) {
      return errorResponse(res, 'Failed to fetch popular destinations', 500);
    }

    successResponse(res, { destinations }, 'Popular destinations retrieved successfully');

  } catch (error) {
    console.error('Popular destinations error:', error);
    errorResponse(res, 'Failed to get popular destinations', 500);
  }
});

module.exports = router;
