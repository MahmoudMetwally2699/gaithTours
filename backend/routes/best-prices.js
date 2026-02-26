const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { protect, admin } = require('../middleware/auth');
const { successResponse, errorResponse, sanitizeFilenameForCloudinary } = require('../utils/helpers');
const BestPriceDeal = require('../models/BestPriceDeal');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ==================== PUBLIC ROUTES ====================

// Get all active best price deals (public)
router.get('/', async (req, res) => {
  try {
    const deals = await BestPriceDeal.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select('-publicId');

    successResponse(res, { deals }, 'Best price deals retrieved successfully');
  } catch (error) {
    console.error('Error fetching best price deals:', error);
    errorResponse(res, 'Failed to fetch best price deals', 500);
  }
});

// Get a single deal by ID (public) — enriched with real hotel data
router.get('/:id', async (req, res) => {
  try {
    const deal = await BestPriceDeal.findById(req.params.id)
      .select('-publicId')
      .lean();

    if (!deal) {
      return errorResponse(res, 'Deal not found', 404);
    }

    // Enrich hotels with real data from HotelContent DB
    try {
      const HotelContent = require('../models/HotelContent');

      // Collect all hotel IDs (hid numbers and string IDs)
      const numericHids = [];
      const stringIds = [];

      for (const hotel of deal.hotels) {
        const hid = hotel.hotelId;
        if (!isNaN(Number(hid))) {
          numericHids.push(Number(hid));
        } else {
          stringIds.push(hid);
        }
      }

      // Query HotelContent for all hotels in one batch
      const query = [];
      if (numericHids.length > 0) query.push({ hid: { $in: numericHids } });
      if (stringIds.length > 0) query.push({ hotelId: { $in: stringIds } });

      if (query.length > 0) {
        const hotelContents = await HotelContent.find(
          query.length === 1 ? query[0] : { $or: query },
          {
            hid: 1, hotelId: 1, name: 1, nameAr: 1, mainImage: 1,
            images: { $slice: 1 }, address: 1, city: 1, country: 1,
            starRating: 1, description: 1
          }
        ).lean();

        // Build lookup map
        const contentMap = {};
        for (const hc of hotelContents) {
          contentMap[String(hc.hid)] = hc;
          if (hc.hotelId) contentMap[hc.hotelId] = hc;
        }

        // Enrich each deal hotel
        for (const hotel of deal.hotels) {
          const content = contentMap[String(hotel.hotelId)] || contentMap[hotel.hotelId];
          if (content) {
            // Use real image from DB (replace size placeholder)
            const realImage = content.mainImage
              ? content.mainImage.replace('{size}', '640x400')
              : (content.images?.[0]?.url?.replace('{size}', '640x400') || '');

            if (realImage) hotel.hotelImage = realImage;
            if (content.nameAr) hotel.hotelNameAr = content.nameAr;
            if (content.address) hotel.address = content.address;
            if (content.city) hotel.city = content.city;
            if (content.country) hotel.country = content.country;
            if (content.starRating) hotel.starRating = content.starRating;
          }
        }
      }

      // Also enrich with TripAdvisor ratings
      try {
        const TripAdvisorHotel = require('../models/TripAdvisorHotel');
        const cities = [...new Set(deal.hotels.map(h => h.city).filter(Boolean))];

        for (const city of cities) {
          const cityHotels = deal.hotels.filter(h => h.city === city);
          const names = cityHotels.map(h => h.hotelName);
          const taResults = await TripAdvisorHotel.findByNamesAndCity(names, city);

          const taMap = {};
          taResults.forEach(ta => {
            taMap[ta.name_normalized] = ta;
            if (ta.search_names) {
              ta.search_names.forEach(alias => { taMap[alias] = ta; });
            }
          });

          cityHotels.forEach(h => {
            const nameNorm = h.hotelName.toLowerCase().trim();
            const ta = taMap[nameNorm];
            if (ta) {
              h.rating = ta.rating;
              h.reviewCount = ta.num_reviews;
              h.tripadvisorLocationId = ta.location_id;
            }
          });
        }
      } catch (taErr) {
        console.error('TripAdvisor enrichment error (non-fatal):', taErr.message);
      }

      // Enrich with live prices from RateHawk
      try {
        const rateHawkService = require('../utils/RateHawkService');
        const requestedCurrency = req.query.currency || 'SAR';
        const cities = [...new Set(deal.hotels.map(h => h.city).filter(Boolean))];

        // Get search dates (today + tomorrow, 1 night)
        const now = new Date();
        const currentHour = now.getHours();
        const daysOffset = currentHour >= 22 ? 1 : 0;
        const dates = rateHawkService.constructor.getDefaultDates(daysOffset, 1);

        // Build a HID lookup for deal hotels
        const dealHidMap = {};
        for (const hotel of deal.hotels) {
          const hid = hotel.hotelId;
          if (!isNaN(Number(hid))) {
            dealHidMap[Number(hid)] = hotel;
          }
          dealHidMap[hid] = hotel;
        }

        // Search each city for prices
        for (const city of cities) {
          try {
            // Get region ID via suggest
            const suggestions = await rateHawkService.suggest(city, 'en');
            const target = suggestions.regions?.[0] || suggestions.hotels?.[0];
            if (!target) continue;

            const regionId = target.region_id || target.id;

            // Search for prices (uses cache if available)
            const searchResults = await rateHawkService.searchByRegion(regionId, {
              checkin: dates.checkin,
              checkout: dates.checkout,
              adults: 2,
              currency: requestedCurrency,
              language: 'en',
              maxResults: 50
            });

            // Match search results to deal hotels by HID
            if (searchResults?.hotels) {
              for (const searchHotel of searchResults.hotels) {
                const dealHotel = dealHidMap[searchHotel.hid] || dealHidMap[String(searchHotel.hid)];
                if (dealHotel) {
                  dealHotel.price = searchHotel.price;
                  dealHotel.pricePerNight = searchHotel.pricePerNight;
                  dealHotel.currency = searchHotel.currency || requestedCurrency;
                  dealHotel.nights = searchHotel.nights || 1;
                }
              }
            }
          } catch (cityErr) {
            console.error(`Price fetch error for city ${city} (non-fatal):`, cityErr.message);
          }
        }
      } catch (priceErr) {
        console.error('Price enrichment error (non-fatal):', priceErr.message);
      }
    } catch (enrichErr) {
      console.error('Hotel enrichment error (non-fatal):', enrichErr.message);
    }

    successResponse(res, { deal }, 'Deal retrieved successfully');
  } catch (error) {
    console.error('Error fetching deal:', error);
    errorResponse(res, 'Failed to fetch deal', 500);
  }
});

// ==================== ADMIN ROUTES ====================

// Get all deals (admin)
router.get('/admin/all', protect, admin, async (req, res) => {
  try {
    const deals = await BestPriceDeal.find()
      .sort({ order: 1, createdAt: -1 });

    successResponse(res, { deals }, 'All deals retrieved successfully');
  } catch (error) {
    console.error('Error fetching all deals:', error);
    errorResponse(res, 'Failed to fetch deals', 500);
  }
});

// Create new deal (admin)
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'Image is required', 400);
    }

    const { title, titleAr, description, descriptionAr, hotels } = req.body;

    if (!title) {
      return errorResponse(res, 'Title is required', 400);
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'best_price_deals',
          public_id: `deal_${Date.now()}_${sanitizeFilenameForCloudinary(req.file.originalname)}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Get current max order
    const maxOrderDeal = await BestPriceDeal.findOne().sort({ order: -1 });
    const nextOrder = maxOrderDeal ? maxOrderDeal.order + 1 : 0;

    // Parse hotels JSON string
    let parsedHotels = [];
    if (hotels) {
      try {
        parsedHotels = JSON.parse(hotels);
      } catch (e) {
        return errorResponse(res, 'Invalid hotels data', 400);
      }
    }

    const deal = new BestPriceDeal({
      title,
      titleAr: titleAr || '',
      description: description || '',
      descriptionAr: descriptionAr || '',
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      hotels: parsedHotels,
      order: nextOrder
    });

    await deal.save();

    successResponse(res, { deal }, 'Deal created successfully', 201);
  } catch (error) {
    console.error('Error creating deal:', error);
    errorResponse(res, 'Failed to create deal', 500);
  }
});

// Update deal (admin)
router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const deal = await BestPriceDeal.findById(req.params.id);
    if (!deal) {
      return errorResponse(res, 'Deal not found', 404);
    }

    const { title, titleAr, description, descriptionAr, hotels, isActive } = req.body;

    if (title) deal.title = title;
    if (titleAr !== undefined) deal.titleAr = titleAr;
    if (description !== undefined) deal.description = description;
    if (descriptionAr !== undefined) deal.descriptionAr = descriptionAr;
    if (isActive !== undefined) deal.isActive = isActive === 'true' || isActive === true;

    // Parse hotels JSON string
    if (hotels) {
      try {
        deal.hotels = JSON.parse(hotels);
      } catch (e) {
        return errorResponse(res, 'Invalid hotels data', 400);
      }
    }

    // Handle image update
    if (req.file) {
      // Delete old image from Cloudinary
      if (deal.publicId) {
        try {
          await cloudinary.uploader.destroy(deal.publicId);
        } catch (err) {
          console.error('Error deleting old image:', err);
        }
      }

      // Upload new image
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: 'best_price_deals',
            public_id: `deal_${Date.now()}_${sanitizeFilenameForCloudinary(req.file.originalname)}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      deal.imageUrl = uploadResult.secure_url;
      deal.publicId = uploadResult.public_id;
    }

    await deal.save();

    successResponse(res, { deal }, 'Deal updated successfully');
  } catch (error) {
    console.error('Error updating deal:', error);
    errorResponse(res, 'Failed to update deal', 500);
  }
});

// Toggle deal active status (admin)
router.patch('/:id/toggle', protect, admin, async (req, res) => {
  try {
    const deal = await BestPriceDeal.findById(req.params.id);
    if (!deal) {
      return errorResponse(res, 'Deal not found', 404);
    }

    deal.isActive = !deal.isActive;
    await deal.save();

    successResponse(res, { deal }, `Deal ${deal.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    console.error('Error toggling deal:', error);
    errorResponse(res, 'Failed to toggle deal status', 500);
  }
});

// Delete deal (admin)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const deal = await BestPriceDeal.findById(req.params.id);
    if (!deal) {
      return errorResponse(res, 'Deal not found', 404);
    }

    // Delete image from Cloudinary
    if (deal.publicId) {
      try {
        await cloudinary.uploader.destroy(deal.publicId);
      } catch (err) {
        console.error('Error deleting image from Cloudinary:', err);
      }
    }

    await BestPriceDeal.findByIdAndDelete(req.params.id);

    successResponse(res, null, 'Deal deleted successfully');
  } catch (error) {
    console.error('Error deleting deal:', error);
    errorResponse(res, 'Failed to delete deal', 500);
  }
});

module.exports = router;
