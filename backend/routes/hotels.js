const express = require('express');
const axios = require('axios');
const { protect } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// Search hotels - simplified to only require destination
router.get('/search', protect, async (req, res) => {
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
    console.log(`Found ${destinations.length} destinations:`, destinations.map(d => ({ name: d.name, type: d.dest_type, hotels: d.hotels || d.nr_hotels })));

    let allHotels = [];
    let totalCount = 0;
    const maxDestinations = 3; // Limit number of destinations to search to prevent timeouts
    let hotelsCollected = 0;
    const targetHotels = actualLimit;

    // Step 2: Fetch hotels from multiple destinations with pagination control
    for (let destIndex = 0; destIndex < Math.min(destinations.length, maxDestinations) && hotelsCollected < targetHotels; destIndex++) {
      const destinationData = destinations[destIndex];
      const destId = destinationData.dest_id;

      console.log(`\n=== Searching destination ${destIndex + 1}/${Math.min(destinations.length, maxDestinations)}: ${destinationData.name} (${destinationData.hotels || destinationData.nr_hotels} hotels) ===`);
      console.log(`Destination type: "${destinationData.dest_type}", Hotels: ${destinationData.hotels || destinationData.nr_hotels || 0}`);

      // Skip destinations with very few hotels to focus on major areas
      // EXCEPTION: Always include hotel-type destinations (specific hotels)
      if (destinationData.dest_type !== 'hotel' && (destinationData.hotels || destinationData.nr_hotels || 0) < 5) {
        console.log(`Skipping ${destinationData.name} - too few hotels (${destinationData.hotels || destinationData.nr_hotels || 0})`);
        continue;
      }

      console.log(`✅ Processing destination: ${destinationData.name} (Type: ${destinationData.dest_type})`);

      // Fetch hotels from this destination (limit to 2 pages per destination to prevent timeouts)
      for (let page = 1; page <= 2 && hotelsCollected < targetHotels; page++) {
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
          timeout: 15000 // Set 15 second timeout to prevent long waits
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
          const pageHotels = hotelResponse.data.data.hotels.map(hotel => {
            const property = hotel.property || {};            // Get the best available photo URL
            const photoUrl = property.photoUrls && property.photoUrls.length > 0
              ? property.photoUrls[0]
              : null;            return {
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

          // Only take what we need to reach our target
          const remainingSlots = targetHotels - hotelsCollected;
          const hotelsToAdd = pageHotels.slice(0, remainingSlots);

          allHotels = allHotels.concat(hotelsToAdd);
          hotelsCollected += hotelsToAdd.length;
          totalCount = hotelResponse.data.data?.total_count || allHotels.length;

          console.log(`Page ${page}: Found ${pageHotels.length} hotels, Added ${hotelsToAdd.length}, Total: ${hotelsCollected}/${targetHotels}`);

          // Stop if we've collected enough hotels
          if (hotelsCollected >= targetHotels) {
            console.log(`✅ Target reached: ${hotelsCollected}/${targetHotels} hotels collected`);
            break;
          }

          // Stop if this page has fewer than 20 hotels (no more results)
          if (pageHotels.length < 20) {
            console.log(`Last page reached (${pageHotels.length} < 20 hotels)`);
            break;
          }

          // Add a small delay between requests to be respectful to the API
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`Error fetching page ${page} for destination ${destinationData.name}:`, error.message);
          if (page === 1) {
            // If first page fails, try next destination
            break;
          }
          break; // Stop fetching more pages if current page fails
        }
      }

      // Log completion for this destination
      console.log(`=== Completed destination ${destIndex + 1}: ${destinationData.name} ===`);

      // Stop if we've collected enough hotels
      if (hotelsCollected >= targetHotels) {
        break;
      }
    }

    console.log('Final transformed hotels:', allHotels.length);

    // Remove duplicates based on hotel ID
    const uniqueHotels = allHotels.filter((hotel, index, self) =>
      index === self.findIndex(h => h.id === hotel.id)
    );

    console.log(`Removed ${allHotels.length - uniqueHotels.length} duplicate hotels`);

    // Implement pagination on the final results
    const startIndex = (pageNumber - 1) * actualLimit;
    const endIndex = startIndex + actualLimit;
    const paginatedHotels = uniqueHotels.slice(startIndex, endIndex);

    successResponse(res, {
      hotels: paginatedHotels,
      total: uniqueHotels.length,
      page: pageNumber,
      limit: actualLimit,
      totalPages: Math.ceil(uniqueHotels.length / actualLimit),
      destinationsSearched: Math.min(destinations.length, maxDestinations),
      totalDestinationsFound: destinations.length
    }, `Hotels retrieved successfully (page ${pageNumber}, ${paginatedHotels.length} hotels of ${uniqueHotels.length} total)`);
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

// Get hotel details by ID
router.get('/details/:hotelId', protect, async (req, res) => {
  try {
    const { hotelId } = req.params;

    const options = {
      method: 'GET',
      url: `https://${process.env.RAPIDAPI_HOST}/api/v1/hotels/getHotelDetails`,
      params: {
        hotel_id: hotelId,
        languagecode: 'en-us'
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
      }
    };

    const response = await axios.request(options);
    const hotel = response.data.data || response.data;    const hotelDetails = {
      id: hotel.hotel_id || hotel.id,
      name: hotel.hotel_name || hotel.name,
      address: hotel.address || hotel.hotel_name || hotel.name || 'Address not available',
      city: hotel.city,
      country: hotel.country,
      rating: hotel.review_score || hotel.rating,
      images: hotel.photos?.map(photo => photo.url_original || photo.url) || hotel.images || [],
      mainImage: hotel.main_photo_url || hotel.mainImage || hotel.images?.[0],
      coordinates: {
        latitude: hotel.latitude || hotel.lat,
        longitude: hotel.longitude || hotel.lng
      },
      description: hotel.description || hotel.hotel_name || hotel.name,
      facilities: hotel.facilities || hotel.amenities || [],
      checkInTime: hotel.checkin?.from || hotel.check_in_time || '15:00',
      checkOutTime: hotel.checkout?.until || hotel.check_out_time || '11:00'
    };

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
