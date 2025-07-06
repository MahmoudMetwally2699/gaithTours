const express = require('express');
const axios = require('axios');
const { protect } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// In-memory cache for hotel search results with pagination support
let hotelSearchCache = new Map();
let hotelPaginationCache = new Map(); // Cache for paginated results

// Search hotels - simplified to only require destination (no authentication required)
router.get('/search', async (req, res) => {
  try {
    const { destination, page = 1, limit = 20 } = req.query;

    if (!destination) {
      return errorResponse(res, 'Destination is required', 400);
    }    // Parse pagination parameters
    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 20; // Default to 20 hotels per page
    const maxLimit = 50; // Maximum hotels per request (reasonable limit)
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

    // Step 1: Search for destinations to get dest_id
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

    const destinationResponse = await axios.request(destinationOptions);
    if (!destinationResponse.data.status || !destinationResponse.data.data || destinationResponse.data.data.length === 0) {
      return successResponse(res, {
        hotels: [],
        total: 0,
        page: 0
      }, 'No destinations found for the given query');
    }    // Get all destinations (cities, regions, etc.) for comprehensive search
    const destinations = destinationResponse.data.data;
    // Sort destinations to prioritize exact matches first, then broader areas
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
    let allHotels = [];
    let totalCount = 0; // Will be calculated after maxDestinations is set    // Identify if this is a search for specific hotels, including exact name matching
    // This will detect searches like "ewaa" that are looking for specific hotels

    // First, check if it's explicitly a hotel search
    const explicitHotelSearch = destination.toLowerCase().includes('hotel') ||
                               destination.toLowerCase().includes('فندق');

    // Check if the user is searching for a specific hotel name
    // Only consider it a hotel search if the destination is specifically a hotel name,
    // not just a city that happens to have hotels with the city name
    const isSpecificHotelSearch = !explicitHotelSearch && sortedDestinations.some(dest => {
      if (dest.dest_type !== 'hotel') return false;

      // For a search to be considered a specific hotel search, the destination should
      // be a distinctive hotel name, not just a city name that appears in hotel names
      const destNameLower = dest.name.toLowerCase();
      const searchLower = destination.toLowerCase();

      // Check if this is a search for a specific hotel (not just a city)
      // The search term should be a substantial part of the hotel name, not just a city reference
      const searchWords = searchLower.split(/\s+/).filter(word => word.length > 2);
      const hotelNameWords = destNameLower.split(/\s+/).filter(word => word.length > 2);

      // If the search is just a single city name and appears at the end of hotel names,
      // it's likely a city search, not a hotel search
      if (searchWords.length === 1) {
        const searchWord = searchWords[0];
        // Common city names that often appear in hotel names
        const cityNames = ['جدة', 'jeddah', 'الرياض', 'riyadh', 'مكة', 'mecca', 'مakkah'];
        if (cityNames.includes(searchWord)) {
          return false; // Don't treat city name searches as hotel searches
        }
      }

      // For multi-word searches, check if it's a distinctive hotel name
      const matchingWords = searchWords.filter(word => destNameLower.includes(word));
      return matchingWords.length >= Math.max(2, Math.floor(searchWords.length * 0.7)); // Need 70% match for hotel names
    });

    const isHotelSearch = explicitHotelSearch || isSpecificHotelSearch;

    // For hotel searches, allow processing more destinations to get all matching hotels
    let maxDestinations = 5; // Optimized default for lazy loading
    if (isHotelSearch) {      // Count how many matching hotel destinations we have
      const cleanDestination = destination.toLowerCase().replace(/hotel/g, '').replace(/,.*$/, '').trim(); // Remove "hotel" and everything after comma
      const matchingHotelCount = sortedDestinations.filter(dest => {
        if (dest.dest_type !== 'hotel') return false;

        const destName = dest.name.toLowerCase();
        const searchTerms = cleanDestination.split(/\s+/).filter(term => term.length > 2); // Split into words, ignore short words

        // Check if most search terms are found in the destination name
        const matchingTerms = searchTerms.filter(term => destName.includes(term));
        return matchingTerms.length >= Math.max(1, Math.floor(searchTerms.length * 0.6)); // At least 60% of terms must match
      }).length;
      maxDestinations = Math.min(10, Math.max(5, matchingHotelCount)); // Balanced: between 5-10 destinations max
    } else {
      // For city searches, process fewer destinations for efficient lazy loading
      maxDestinations = Math.min(2 + Math.ceil(pageNumber / 2), sortedDestinations.length); // Gradually increase with page number
    }

    // Calculate estimated total hotels available for better pagination
    const estimatedTotalHotels = sortedDestinations
      .slice(0, Math.min(maxDestinations, sortedDestinations.length))
      .reduce((sum, dest) => sum + (dest.hotels || dest.nr_hotels || 0), 0);

    totalCount = estimatedTotalHotels; // Set the estimated total

    let hotelsCollected = 0;

    // Lazy loading: Only fetch what's needed for the current page + a small buffer
    const hotelsPerPage = actualLimit;    // Calculate how many total hotels we need for this page (true lazy loading)
    // We need enough hotels to fill from page 1 to the current page, plus a buffer for duplicates
    const hotelsNeededForCurrentPage = pageNumber * hotelsPerPage;

    // Account for duplicates: collect extra hotels to ensure we have enough unique ones
    // Higher pages need more buffer due to more potential duplicates
    const duplicateBuffer = Math.min(pageNumber * hotelsPerPage * 0.5, 100); // 50% buffer, max 100
    const bufferSize = hotelsPerPage + duplicateBuffer; // Base buffer + duplicate buffer
    const targetHotels = hotelsNeededForCurrentPage + bufferSize;

    // Check if we have cached results for this destination
    // Include search type in cache key to differentiate between exact hotel searches and area searches
    const searchTypeIndicator = isHotelSearch ? 'hotel_search' : 'area_search';
    // Use a consistent cache key based on the destination and search type
    const cleanSearchTerms = destination.toLowerCase().replace(/hotel/g, '').replace(/,.*$/, '').trim().replace(/\s+/g, '_');
    const destinationCacheKey = `${cleanSearchTerms}_${searchTypeIndicator}_${arrivalDate}_${departureDate}`;
    const cachedData = hotelSearchCache.get(destinationCacheKey);

    if (cachedData && cachedData.allHotels) {
      let hotelsToUse = cachedData.allHotels;

      // For exact hotel searches, filter cached results to only include matching hotels
      // For city searches, use all cached hotels
      if (isHotelSearch) {
        const cleanDestination = destination.toLowerCase().replace(/hotel/g, '').replace(/,.*$/, '').trim();
        const searchTerms = cleanDestination.split(/\s+/).filter(term => term.length > 2);

        // Create city name mappings for Arabic-English translations
        const cityMappings = {
          'جدة': ['jeddah', 'jedda', 'jeda'],
          'الرياض': ['riyadh', 'riyad', 'ar-riyadh'],
          'مكة': ['mecca', 'makkah', 'makkah al-mukarramah'],
          'المدينة': ['medina', 'madinah', 'al-madinah'],
          'الدمام': ['dammam', 'ad-dammam'],
          'الطائف': ['taif', 'at-taif'],
          'أبها': ['abha', 'abhā'],
          'تبوك': ['tabuk', 'tabouk'],
          'الخبر': ['khobar', 'al-khobar', 'alkhobar'],
          'بريدة': ['buraidah', 'buraydah'],
          'خميس مشيط': ['khamis mushait', 'khamis mushayt']
        };

        // Get all possible search terms including translations
        const allSearchTerms = [...searchTerms];
        searchTerms.forEach(term => {
          if (cityMappings[term]) {
            allSearchTerms.push(...cityMappings[term]);
          }
          // Also check reverse mapping (English to Arabic)
          Object.entries(cityMappings).forEach(([arabic, englishVariants]) => {
            if (englishVariants.includes(term)) {
              allSearchTerms.push(arabic);
            }
          });
        });

        const matchingHotels = cachedData.allHotels.filter(hotel => {
          const hotelNameLower = hotel.name.toLowerCase();

          // For very specific searches (like "Ewaa Express Hotel - Al Shati"), use stricter matching
          if (destination.toLowerCase().includes(' - ') || destination.toLowerCase().includes('express') || destination.toLowerCase().includes('ewaa')) {
            // Check if the hotel name contains the key identifying terms
            const keyTerms = destination.toLowerCase().split(/[\s\-]+/).filter(term => term.length > 2);
            const matchingKeyTerms = keyTerms.filter(term => hotelNameLower.includes(term));
            const matches = matchingKeyTerms.length >= Math.max(2, Math.floor(keyTerms.length * 0.8)); // 80% of terms must match for specific searches
            return matches;
          }

          // Check if any of the extended search terms are found in the hotel name
          const matchingTerms = allSearchTerms.filter(term => hotelNameLower.includes(term));
          const matches = matchingTerms.length >= Math.max(1, Math.floor(searchTerms.length * 0.6));
          return matches;
        });

        if (matchingHotels.length > 0) {
          hotelsToUse = matchingHotels;
        } else {
          // Don't use cached data if no matches found for hotel search
          hotelsToUse = []; // Set to empty array to skip cache usage
        }
      }

      // Only proceed with cache if we have filtered hotels (for hotel searches) or any hotels (for area searches)
      if (hotelsToUse.length > 0) {
        // Check if we have enough cached hotels for this specific page
        const startIndex = (pageNumber - 1) * actualLimit;
        const endIndex = startIndex + actualLimit;
        const availableForThisPage = hotelsToUse.slice(startIndex, endIndex);

        if (availableForThisPage.length === actualLimit || (pageNumber === Math.ceil(hotelsToUse.length / actualLimit) && availableForThisPage.length > 0)) {
          // We have enough hotels for this specific page OR this is the last page with some hotels

          return successResponse(res, {
            hotels: availableForThisPage,
            total: Math.max(hotelsToUse.length, estimatedTotalHotels),
            page: pageNumber,
            limit: actualLimit,
            totalPages: Math.ceil(Math.max(hotelsToUse.length, estimatedTotalHotels) / actualLimit),
            destinationsSearched: cachedData.destinationsSearched || 0,
            totalDestinationsFound: cachedData.totalDestinationsFound || 0,
            fromCache: true,
            estimatedTotal: estimatedTotalHotels,
            cachedHotels: hotelsToUse.length
          }, `Hotels retrieved from cache (page ${pageNumber}, ${availableForThisPage.length} hotels of ${Math.max(hotelsToUse.length, estimatedTotalHotels)} estimated total)`);
        } else if (hotelsToUse.length >= hotelsNeededForCurrentPage) {
          // We have enough total hotels but need to paginate

          const paginatedHotels = hotelsToUse.slice(startIndex, endIndex);

          return successResponse(res, {
            hotels: paginatedHotels,
            total: Math.max(hotelsToUse.length, estimatedTotalHotels),
            page: pageNumber,
            limit: actualLimit,
            totalPages: Math.ceil(Math.max(hotelsToUse.length, estimatedTotalHotels) / actualLimit),
            destinationsSearched: cachedData.destinationsSearched || 0,
            totalDestinationsFound: cachedData.totalDestinationsFound || 0,
            fromCache: true,
            estimatedTotal: estimatedTotalHotels,
            cachedHotels: hotelsToUse.length
          }, `Hotels retrieved from cache (page ${pageNumber}, ${paginatedHotels.length} hotels of ${Math.max(hotelsToUse.length, estimatedTotalHotels)} estimated total)`);
        } else {
          // Continue with API calls to fetch more hotels, starting from what we have
          allHotels = [...hotelsToUse];
          hotelsCollected = hotelsToUse.length;
        }
      }
    }

    // For hotel searches, first collect all exact matching hotel destinations
    let exactMatchHotels = [];
    if (isHotelSearch) {      const cleanDestination = destination.toLowerCase().replace(/hotel/g, '').replace(/,.*$/, '').trim();
      const searchTerms = cleanDestination.split(/\s+/).filter(term => term.length > 2);

      const exactMatchDestinations = sortedDestinations.filter(dest => {
        if (dest.dest_type !== 'hotel') return false;
        const destName = dest.name.toLowerCase();
        const matchingTerms = searchTerms.filter(term => destName.includes(term));
        return matchingTerms.length >= Math.max(1, Math.floor(searchTerms.length * 0.6));
      });

      // Process all exact matches first
      for (const exactDest of exactMatchDestinations.slice(0, 10)) { // Limit to 10 exact matches
        // We'll collect these in the main loop but ensure they're prioritized
      }
    }    // Step 2: Fetch hotels from multiple destinations with pagination control
    for (let destIndex = 0; destIndex < Math.min(sortedDestinations.length, maxDestinations); destIndex++) {
      const destinationData = sortedDestinations[destIndex];
      const destId = destinationData.dest_id;

      // For hotel searches, check if this is a matching hotel destination
      let isMatchingHotel = false;
      if (isHotelSearch && destinationData.dest_type === 'hotel') {
        const cleanDestination = destination.toLowerCase().replace(/hotel/g, '').replace(/,.*$/, '').trim();
        const destName = destinationData.name.toLowerCase();
        const searchTerms = cleanDestination.split(/\s+/).filter(term => term.length > 2);

        // Check if most search terms are found in the destination name
        const matchingTerms = searchTerms.filter(term => destName.includes(term));
        isMatchingHotel = matchingTerms.length >= Math.max(1, Math.floor(searchTerms.length * 0.6));
      }// For hotel searches: ALWAYS process ALL matching hotel destinations
      // For regular searches: stop when we have enough for current page
      if (isHotelSearch && isMatchingHotel) {
      }      // For hotel searches with non-matching destinations: stop when we have enough for current page
      else if (isHotelSearch && !isMatchingHotel && hotelsCollected >= hotelsNeededForCurrentPage) {
        break;
      }

      // Special handling for Ewaa hotels or similar exact name matches
      if (isHotelSearch && destination.toLowerCase() === 'ewaa') {
        const isEwaaHotel = destinationData.name.toLowerCase().includes('ewaa');
        if (isEwaaHotel) {
          isMatchingHotel = true; // Force process this hotel
        }
      }      // Skip destinations with very few hotels, BUT be more lenient for hotel searches
      const hotelCount = destinationData.hotels || destinationData.nr_hotels || 0;

      // For hotel searches, prioritize exact matches and skip non-matching destinations after first few
      if (isHotelSearch && !isMatchingHotel && destIndex > 2 && hotelsCollected > 0) {
        continue;
      }

      if (hotelCount < 5) {
        // For cities and districts, be more lenient (allow even 1-2 hotels)
        if (['city', 'district'].includes(destinationData.dest_type)) {
        }
        // For hotel searches, include individual hotels that match
        else if (isHotelSearch && destinationData.dest_type === 'hotel') {
        }        // For individual hotels in general search, only include if we need more results
        else if (destinationData.dest_type === 'hotel' && hotelsCollected < hotelsNeededForCurrentPage / 2) {
        }// For other types with few hotels, skip
        else {
          continue;
        }      }
      // Fetch hotels from this destination
      // Adjust page fetching based on current request page
      const maxPagesPerDestination = Math.min(5, Math.max(2, pageNumber)); // More pages for later requests
      const continueForMatching = isHotelSearch && isMatchingHotel;

      for (let page = 1; page <= maxPagesPerDestination && (continueForMatching || hotelsCollected < targetHotels); page++) {
        // CRITICAL FIX: Use correct search_type based on destination type
        let searchType = 'city'; // default
        if (destinationData.dest_type === 'hotel') {
          searchType = 'hotel';
        } else if (destinationData.dest_type === 'city') {
          searchType = 'city';        } else if (destinationData.dest_type === 'district') {
          searchType = 'district';
        }

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
          const hotelResponse = await axios.request(hotelOptions);
          // Check if the hotel search was successful
          if (!hotelResponse.data.status) {
            if (page === 1) {
              // If first page fails, try next destination
              break;
            }
            break; // Stop fetching more pages if current page fails
          }          // Check if hotels data exists
          if (!hotelResponse.data.data || !hotelResponse.data.data.hotels || hotelResponse.data.data.hotels.length === 0) {
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
                photoUrl = originalUrl.replace('square180', 'max1280');              } else {
                photoUrl = originalUrl;
              }
            }

            return {
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
            });            if (exactMatchHotels.length > 0) {
              pageHotels = exactMatchHotels;
            }
          }          // Only take what we need to reach our target for the current page, unless it's an exact hotel match
          let hotelsToAdd;          if (isHotelSearch && destinationData.dest_type === 'hotel' && isMatchingHotel) {
            // For exact hotel matches, take all matching hotels regardless of limit
            hotelsToAdd = pageHotels;} else {
            // For other searches, control the amount based on current needs for the requested page
            const remainingNeeded = Math.max(0, hotelsNeededForCurrentPage - hotelsCollected);
            hotelsToAdd = remainingNeeded > 0 ? pageHotels.slice(0, Math.max(remainingNeeded, hotelsPerPage)) : pageHotels.slice(0, hotelsPerPage);
          }          allHotels = allHotels.concat(hotelsToAdd);
          hotelsCollected += hotelsToAdd.length;
          totalCount = hotelResponse.data.data?.total_count || allHotels.length;
          // For hotel searches with exact matches, always continue
          // For other searches, stop when we've collected enough hotels for the current page          // But account for potential duplicates by checking if we need more
          if (hotelsCollected >= targetHotels && !(isHotelSearch && isMatchingHotel)) {
            break;
          }          // For exact hotel matches, log but continue to next destination
          if (isHotelSearch && isMatchingHotel) {
          }// For exact hotel matches, always continue to get the specific hotel
          if (isHotelSearch && destinationData.dest_type === 'hotel' && isMatchingHotel) {
            break; // Break from pages loop but continue to next destination
          }          // Stop if this page has fewer than 10 hotels (indicating we're near the end of results)
          if (pageHotels.length < 10) {
            break;
          }          // Minimal delay between requests for faster response while respecting rate limits
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          if (page === 1) {
            // If first page fails, try next destination
            break;
          }
          break; // Stop fetching more pages if current page fails
        }
      }      // Log completion for this destination
      // For hotel searches: check if we need to continue for more exact matches
      if (isHotelSearch) {        // Check if there are more matching hotel destinations to process AND we still need more hotels
        const cleanDestination = destination.toLowerCase().replace(/hotel/g, '').replace(/,.*$/, '').trim();
        const searchTerms = cleanDestination.split(/\s+/).filter(term => term.length > 2);

        const remainingMatchingHotels = sortedDestinations.slice(destIndex + 1).some(dest => {
          if (dest.dest_type !== 'hotel') return false;
          const destName = dest.name.toLowerCase();
          const matchingTerms = searchTerms.filter(term => destName.includes(term));
          return matchingTerms.length >= Math.max(1, Math.floor(searchTerms.length * 0.6));
        });        // Only continue if we have more matching hotels AND we haven't got enough for current page
        if (remainingMatchingHotels && hotelsCollected < hotelsNeededForCurrentPage) {
          continue;        } else if (hotelsCollected >= hotelsNeededForCurrentPage) {
          break;        } else {
          break;
        }
      }      // For regular searches, stop when we have enough hotels for the current page
      if (!isHotelSearch && hotelsCollected >= targetHotels) {
        break;
      }      // For hotel searches with non-matching destinations: stop when we have enough for current page
      else if (isHotelSearch && !isMatchingHotel && hotelsCollected >= targetHotels) {
        break;}
    }

    // Remove duplicates based on hotel ID
    const uniqueHotels = allHotels.filter((hotel, index, self) =>
      index === self.findIndex(h => h.id === hotel.id)    );
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
      const bScore = bExactMatch + bStartsWith + bContains + bWordMatches + b.rating;      return bScore - aScore; // Higher score first
    });

    // Implement pagination on the final sorted results
    const startIndex = (pageNumber - 1) * actualLimit;
    const endIndex = startIndex + actualLimit;    const paginatedHotels = sortedHotels.slice(startIndex, endIndex);
    
    // Create cache key for this specific search and page (include search type)
    const cacheKey = `${destination.toLowerCase()}_${searchTypeIndicator}_page_${pageNumber}_limit_${actualLimit}`;    // Check if we have cached results for this exact search and page
    if (hotelPaginationCache.has(cacheKey)) {
      const cachedResult = hotelPaginationCache.get(cacheKey);
      return successResponse(res, cachedResult, 'Hotels retrieved from cache');
    }    // Cache the search results for use in hotel details fallback and future pagination
    // Use the same improved cache key that includes search type
    hotelSearchCache.set(destinationCacheKey, {
      allHotels: sortedHotels,
      destinationsSearched: Math.min(destinations.length, maxDestinations),
      totalDestinationsFound: destinations.length,
      timestamp: Date.now(),
      searchType: searchTypeIndicator // Store the search type for debugging
    });

    // Cache the paginated results for this specific page
    const responseData = {
      hotels: paginatedHotels,
      total: Math.max(sortedHotels.length, totalCount), // Use the larger of collected hotels or estimated total
      page: pageNumber,
      limit: actualLimit,
      totalPages: Math.ceil(Math.max(sortedHotels.length, totalCount) / actualLimit),
      destinationsSearched: Math.min(destinations.length, maxDestinations),
      totalDestinationsFound: destinations.length,
      isLazyLoading: true,
      hotelsCollected: sortedHotels.length,
      estimatedTotal: totalCount
    };

    hotelPaginationCache.set(cacheKey, responseData);

    // Keep cache size reasonable (max 100 entries for pagination cache)
    if (hotelPaginationCache.size > 100) {
      const firstKey = hotelPaginationCache.keys().next().value;
      hotelPaginationCache.delete(firstKey);
    }

    // Keep search cache size reasonable (max 50 entries)
    if (hotelSearchCache.size > 50) {
      const firstKey = hotelSearchCache.keys().next().value;
      hotelSearchCache.delete(firstKey);
    }

    successResponse(res, responseData, `Hotels retrieved successfully (page ${pageNumber}, ${paginatedHotels.length} hotels of ${sortedHotels.length} total)`);
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
router.get('/details/:hotelId', protect, async (req, res) => {  try {
    const { hotelId } = req.params;
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

      const response = await axios.request(options);      const hotel = response.data.data || response.data;
      // Check if we got meaningful data
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
      }
    } catch (detailsError) {
    }    // If we don't have detailed data, check our search cache for this hotel
    if (!hasDetailedData) {
      // Look for this hotel in our search cache
      let foundHotel = null;
      for (const [cacheKey, cachedHotels] of hotelSearchCache.entries()) {
        const hotel = cachedHotels.find(h => h.id === hotelId);        if (hotel) {
          foundHotel = hotel;
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
          isPreferred: foundHotel.isPreferred || false        };
      }
    }    // If we still don't have hotel details, create a fallback with basic info
    if (!hotelDetails) {
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
        checkOutTime: '11:00'      };
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
