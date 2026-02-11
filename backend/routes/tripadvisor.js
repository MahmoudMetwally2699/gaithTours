const express = require('express');
const { successResponse, errorResponse } = require('../utils/helpers');
const tripadvisorService = require('../utils/tripadvisorService');

const router = express.Router();

/**
 * Get TripAdvisor ratings for a list of hotels in a city
 * GET /api/tripadvisor/ratings?hotelNames=Hotel1,Hotel2&city=Cairo
 *
 * Returns ratings from DB if available, otherwise fetches from TripAdvisor API
 * and saves permanently to DB.
 */
router.get('/ratings', async (req, res) => {
  try {
    const { hotelNames, city } = req.query;

    if (!hotelNames || !city) {
      return errorResponse(res, 'hotelNames and city are required', 400);
    }

    // Parse hotel names (comma-separated)
    const names = hotelNames.split(',').map(n => n.trim()).filter(Boolean);

    if (names.length === 0) {
      return errorResponse(res, 'At least one hotel name is required', 400);
    }

    if (names.length > 20) {
      return errorResponse(res, 'Maximum 20 hotels per request', 400);
    }

    console.log(`🔍 TripAdvisor ratings request: ${names.length} hotels in "${city}"`);

    const ratings = await tripadvisorService.getHotelRatings(names, city);

    successResponse(res, ratings, 'TripAdvisor ratings retrieved successfully');

  } catch (error) {
    console.error('❌ TripAdvisor ratings error:', error);
    errorResponse(res, error.message, 500);
  }
});

/**
 * Get TripAdvisor reviews for a specific hotel by location ID
 * GET /api/tripadvisor/reviews/:locationId?language=en
 *
 * Returns reviews from DB if available, otherwise fetches from TripAdvisor API.
 */
router.get('/reviews/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    const { language = 'en' } = req.query;

    if (!locationId) {
      return errorResponse(res, 'locationId is required', 400);
    }

    console.log(`💬 TripAdvisor reviews request: locationId=${locationId}, lang=${language}`);

    const result = await tripadvisorService.getHotelReviews(locationId, language);

    successResponse(res, result, 'TripAdvisor reviews retrieved successfully');

  } catch (error) {
    console.error('❌ TripAdvisor reviews error:', error);
    errorResponse(res, error.message, 500);
  }
});

/**
 * Search TripAdvisor for hotels (utility endpoint)
 * GET /api/tripadvisor/search?query=Hilton Cairo
 */
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return errorResponse(res, 'query is required', 400);
    }

    const results = await tripadvisorService.searchLocation(query, 'hotels');

    successResponse(res, results, 'TripAdvisor search results');

  } catch (error) {
    console.error('❌ TripAdvisor search error:', error);
    errorResponse(res, error.message, 500);
  }
});

module.exports = router;
