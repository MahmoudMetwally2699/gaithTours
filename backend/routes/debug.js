const express = require('express');
const rateHawkService = require('../utils/RateHawkService');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

/**
 * Debug endpoint to test RateHawk image fetching
 * GET /api/debug/test-images?destination=Cairo
 */
router.get('/test-images', async (req, res) => {
  try {
    const { destination = 'Cairo' } = req.query;

    console.log(`🔍 Testing image fetch for: ${destination}`);

    // Step 1: Get suggestions
    const suggestions = await rateHawkService.suggest(destination);
    console.log(`✅ Suggestions: ${suggestions.regions?.length || 0} regions, ${suggestions.hotels?.length || 0} hotels`);

    // Step 2: Search hotels
    const regionId = suggestions.regions?.[0]?.id || suggestions.hotels?.[0]?.region_id;
    if (!regionId) {
      return errorResponse(res, 'No region found', 404);
    }

    const searchResults = await rateHawkService.searchByRegion(regionId, {
      checkin: '2025-02-01',
      checkout: '2025-02-04',
      adults: 2
    });

    console.log(`✅ Search results: ${searchResults.hotels?.length || 0} hotels`);

    // Check first hotel's image
    const firstHotel = searchResults.hotels?.[0];
    if (firstHotel) {
      console.log(`📸 First hotel:`);
      console.log(`   Name: ${firstHotel.name}`);
      console.log(`   Image: ${firstHotel.image}`);
      console.log(`   HID: ${firstHotel.hid}`);
    }

    successResponse(res, {
      destination,
      regionId,
      hotelsFound: searchResults.hotels?.length || 0,
      firstHotel: firstHotel ? {
        name: firstHotel.name,
        image: firstHotel.image,
        hid: firstHotel.hid,
        price: firstHotel.price
      } : null
    }, 'Debug test completed');

  } catch (error) {
    console.error('❌ Debug test error:', error.message);
    errorResponse(res, error.message, 500);
  }
});

module.exports = router;
