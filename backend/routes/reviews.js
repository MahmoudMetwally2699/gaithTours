const express = require('express');
const { successResponse, errorResponse } = require('../utils/helpers');
const rateHawkService = require('../utils/RateHawkService');
const HotelReview = require('../models/HotelReview');

const router = express.Router();

/**
 * Get top-rated guest reviews for the home page (from TripAdvisor data)
 * GET /api/reviews/top-reviews
 * Query: limit (default 8), language (default 'en')
 */
router.get('/top-reviews', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 8, 20);
    const TripAdvisorHotel = require('../models/TripAdvisorHotel');

    // Find hotels that have reviews and high ratings
    const hotels = await TripAdvisorHotel.find({
      rating: { $gte: 4 },
      'reviews.0': { $exists: true },
      num_reviews: { $ne: '0' }
    })
      .select('name city rating num_reviews reviews rating_image_url')
      .sort({ rating: -1 })
      .limit(50)
      .lean();

    // Extract individual reviews with hotel context
    const allReviews = [];
    for (const hotel of hotels) {
      if (!hotel.reviews || hotel.reviews.length === 0) continue;
      for (const review of hotel.reviews) {
        if (review.rating >= 4 && review.text && review.text.length > 20) {
          allReviews.push({
            id: review.id,
            hotelName: hotel.name,
            hotelCity: hotel.city,
            hotelRating: hotel.rating,
            hotelReviewCount: hotel.num_reviews,
            reviewTitle: review.title || '',
            reviewText: review.text,
            reviewRating: review.rating,
            tripType: review.trip_type || '',
            travelDate: review.travel_date || '',
            publishedDate: review.published_date || '',
            author: review.user?.username || 'Guest',
            authorLocation: review.user?.user_location?.name || '',
            authorAvatar: review.user?.avatar?.small || review.user?.avatar?.thumbnail || '',
          });
        }
      }
    }

    // Shuffle and pick top reviews for variety
    const shuffled = allReviews.sort(() => Math.random() - 0.5);
    const topReviews = shuffled.slice(0, limit);

    res.set('Cache-Control', 'public, max-age=3600');
    successResponse(res, { reviews: topReviews }, 'Top reviews retrieved');
  } catch (error) {
    console.error('Top reviews error:', error);
    errorResponse(res, 'Failed to get top reviews', 500);
  }
});

/**
 * Get reviews for a specific hotel
 * GET /api/reviews/hotel/:hotelId
 * Query params:
 *   - language (optional, default: 'en')
 *   - limit (optional, default: all)
 *   - sort (optional, 'recent' | 'rating', default: 'recent')
 */
router.get('/hotel/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { language = 'en', limit, sort = 'recent' } = req.query;

    console.log(`📖 Getting reviews for hotel: ${hotelId}, language: ${language}`);

    // First, try to get reviews from database
    let hotelReviews = await HotelReview.findByHotelId(hotelId, language);

    // If not found in DB or data is old (> 7 days), fetch from API
    const shouldRefresh = !hotelReviews ||
      (Date.now() - new Date(hotelReviews.last_updated).getTime()) > 7 * 24 * 60 * 60 * 1000;

    if (shouldRefresh) {
      console.log('🔄 Fetching fresh reviews from API...');

      try {
        // Fetch from Content API
        const apiReviews = await rateHawkService.getReviewsByIds([hotelId], language);

        if (apiReviews && apiReviews.length > 0) {
          const reviewData = apiReviews[0];

          // Update or create in database
          hotelReviews = await HotelReview.findOneAndUpdate(
            {
              $or: [
                { hid: reviewData.hid, language },
                { hotel_id: reviewData.hotel_id, language }
              ]
            },
            {
              hotel_id: reviewData.hotel_id,
              hid: reviewData.hid,
              language,
              reviews: reviewData.reviews,
              source: 'api',
              last_updated: new Date()
            },
            {
              upsert: true,
              new: true,
              runValidators: true
            }
          );

          console.log('✅ Reviews updated in database');
        }
      } catch (apiError) {
        console.error('⚠️ Error fetching from API:', apiError.message);
        // Continue with cached data if available
      }
    }

    if (!hotelReviews) {
      return errorResponse(res, 'No reviews found for this hotel', 404);
    }

    // Get reviews based on sort preference
    let reviews = sort === 'rating'
      ? hotelReviews.getTopReviews(limit ? parseInt(limit) : hotelReviews.reviews.length)
      : hotelReviews.getRecentReviews(limit ? parseInt(limit) : hotelReviews.reviews.length);

    // Get rating distribution
    const distribution = hotelReviews.getRatingDistribution();

    const response = {
      hotel_id: hotelReviews.hotel_id,
      hid: hotelReviews.hid,
      language: hotelReviews.language,
      average_rating: hotelReviews.average_rating,
      review_count: hotelReviews.review_count,
      rating_distribution: distribution,
      reviews,
      last_updated: hotelReviews.last_updated
    };

    successResponse(res, response, 'Reviews retrieved successfully');
  } catch (error) {
    console.error('❌ Error getting hotel reviews:', error);
    errorResponse(res, error.message, 500);
  }
});

/**
 * Get review summaries for multiple hotels
 * POST /api/reviews/summaries
 * Body:
 *   - hotelIds: Array of hotel IDs
 *   - language (optional, default: 'en')
 */
router.post('/summaries', async (req, res) => {
  try {
    const { hotelIds, language = 'en' } = req.body;

    if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
      return errorResponse(res, 'hotelIds must be a non-empty array', 400);
    }

    console.log(`📊 Getting review summaries for ${hotelIds.length} hotels`);

    // Get summaries from database
    const summaries = await HotelReview.getSummaries(hotelIds, language);

    // Convert to map for easy lookup
    const summaryMap = {};
    summaries.forEach(summary => {
      const key = summary.hid || summary.hotel_id;
      summaryMap[key] = {
        hotel_id: summary.hotel_id,
        hid: summary.hid,
        average_rating: summary.average_rating,
        overall_rating: summary.overall_rating,
        review_count: summary.review_count
      };
    });

    // Match with requested IDs
    const results = hotelIds.map(id => {
      const summary = summaryMap[id];
      return summary || {
        hotel_id: typeof id === 'string' ? id : null,
        hid: typeof id === 'number' ? id : parseInt(id),
        average_rating: null,
        review_count: 0,
        error: 'No reviews available'
      };
    });

    successResponse(res, results, 'Review summaries retrieved successfully');
  } catch (error) {
    console.error('❌ Error getting review summaries:', error);
    errorResponse(res, error.message, 500);
  }
});

/**
 * Get reviews dump information
 * GET /api/reviews/dump
 * Query params:
 *   - language (optional, default: 'en')
 *   - incremental (optional, default: false)
 */
router.get('/dump', async (req, res) => {
  try {
    const { language = 'en', incremental = 'false' } = req.query;
    const isIncremental = incremental === 'true';

    console.log(`📦 Getting ${isIncremental ? 'incremental' : 'full'} reviews dump for language: ${language}`);

    let dumpInfo;
    if (isIncremental) {
      dumpInfo = await rateHawkService.getIncrementalReviewsDump(language);
    } else {
      dumpInfo = await rateHawkService.getReviewsDump(language);
    }

    if (!dumpInfo.success) {
      return errorResponse(res, dumpInfo.message, dumpInfo.error === 'dump_not_ready' ? 503 : 500);
    }

    successResponse(res, dumpInfo, 'Dump information retrieved successfully');
  } catch (error) {
    console.error('❌ Error getting dump information:', error);
    errorResponse(res, error.message, 500);
  }
});

/**
 * Refresh reviews for specific hotels from API
 * POST /api/reviews/refresh
 * Body:
 *   - hotelIds: Array of hotel IDs
 *   - language (optional, default: 'en')
 */
router.post('/refresh', async (req, res) => {
  try {
    const { hotelIds, language = 'en' } = req.body;

    if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
      return errorResponse(res, 'hotelIds must be a non-empty array', 400);
    }

    if (hotelIds.length > 100) {
      return errorResponse(res, 'Maximum 100 hotels can be refreshed at once', 400);
    }

    console.log(`🔄 Refreshing reviews for ${hotelIds.length} hotels from API`);

    // Fetch from Content API
    const apiReviews = await rateHawkService.getReviewsByIds(hotelIds, language);

    // Update database
    const updatePromises = apiReviews.map(async (reviewData) => {
      if (reviewData.reviews && reviewData.reviews.length > 0) {
        return HotelReview.findOneAndUpdate(
          {
            $or: [
              { hid: reviewData.hid, language },
              { hotel_id: reviewData.hotel_id, language }
            ]
          },
          {
            hotel_id: reviewData.hotel_id,
            hid: reviewData.hid,
            language,
            reviews: reviewData.reviews,
            source: 'api',
            last_updated: new Date()
          },
          {
            upsert: true,
            new: true,
            runValidators: true
          }
        );
      }
      return null;
    });

    const results = await Promise.all(updatePromises);
    const successCount = results.filter(r => r !== null).length;

    console.log(`✅ Successfully refreshed ${successCount}/${hotelIds.length} hotels`);

    successResponse(res, {
      total: hotelIds.length,
      updated: successCount,
      language
    }, 'Reviews refreshed successfully');
  } catch (error) {
    console.error('❌ Error refreshing reviews:', error);
    errorResponse(res, error.message, 500);
  }
});

/**
 * Get review statistics
 * GET /api/reviews/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { language } = req.query;

    const query = language ? { language } : {};

    const stats = await HotelReview.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$language',
          total_hotels: { $sum: 1 },
          total_reviews: { $sum: '$review_count' },
          avg_rating: { $avg: '$average_rating' },
          hotels_with_reviews: {
            $sum: { $cond: [{ $gt: ['$review_count', 0] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          language: '$_id',
          total_hotels: 1,
          total_reviews: 1,
          avg_rating: { $round: ['$avg_rating', 2] },
          hotels_with_reviews: 1,
          _id: 0
        }
      }
    ]);

    successResponse(res, stats, 'Statistics retrieved successfully');
  } catch (error) {
    console.error('❌ Error getting statistics:', error);
    errorResponse(res, error.message, 500);
  }
});

module.exports = router;
