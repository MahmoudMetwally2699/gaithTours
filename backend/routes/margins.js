const express = require('express');
const { body, validationResult } = require('express-validator');
const MarginRule = require('../models/MarginRule');
const MarginService = require('../utils/marginService');
const HotelContent = require('../models/HotelContent');
const { protect, admin } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// Country code to name mapping
const countryCodeMap = {
  'SA': 'Saudi Arabia',
  'AE': 'United Arab Emirates',
  'EG': 'Egypt',
  'JO': 'Jordan',
  'BH': 'Bahrain',
  'KW': 'Kuwait',
  'OM': 'Oman',
  'QA': 'Qatar',
  'TR': 'Turkey',
  'GB': 'United Kingdom',
  'US': 'United States',
  'FR': 'France',
  'DE': 'Germany',
  'IT': 'Italy',
  'ES': 'Spain',
  'TH': 'Thailand',
  'MY': 'Malaysia',
  'ID': 'Indonesia',
  'SG': 'Singapore',
  'IN': 'India',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
  'LK': 'Sri Lanka',
  'MV': 'Maldives',
  'MA': 'Morocco',
  'TN': 'Tunisia',
  'LB': 'Lebanon',
  'IQ': 'Iraq',
  'SY': 'Syria',
  'YE': 'Yemen',
  'PS': 'Palestine',
  'SD': 'Sudan',
  'LY': 'Libya',
  'DZ': 'Algeria',
};

// Reverse map: country name to code
const countryNameToCode = Object.entries(countryCodeMap).reduce((acc, [code, name]) => {
  acc[name] = code;
  return acc;
}, {});

// Get available locations (countries and cities) from HotelContent
router.get('/locations', protect, admin, async (req, res) => {
  try {
    // Get selected country names from query (comma-separated)
    const selectedCountries = req.query.countries ? req.query.countries.split(',') : [];

    // Map country names to codes for filtering
    const selectedCountryCodes = selectedCountries
      .map(name => countryNameToCode[name.trim()])
      .filter(Boolean);

    // Build cities query - filter by country codes if any selected
    const citiesQuery = { city: { $ne: null, $ne: '' } };
    if (selectedCountryCodes.length > 0) {
      citiesQuery.countryCode = { $in: selectedCountryCodes };
    }

    const [countryCodes, cities] = await Promise.all([
      HotelContent.distinct('countryCode', { countryCode: { $ne: null, $ne: '' } }),
      HotelContent.distinct('city', citiesQuery)
    ]);

    // Map country codes to full names and sort
    const countries = countryCodes
      .filter(Boolean)
      .map(code => ({
        code,
        name: countryCodeMap[code] || code
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Sort cities alphabetically
    const sortedCities = cities.filter(Boolean).sort((a, b) => a.localeCompare(b));

    successResponse(res, {
      countries: countries,
      cities: sortedCities,
      totalCountries: countries.length,
      totalCities: sortedCities.length
    }, 'Locations retrieved successfully');
  } catch (error) {
    console.error('Error fetching locations:', error);
    errorResponse(res, 'Failed to fetch locations', 500);
  }
});

// Get all margin rules with pagination and filters
router.get('/', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query filters
    const query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.type) {
      query.type = req.query.type;
    }

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.country) {
      query['conditions.countries'] = req.query.country;
    }

    if (req.query.city) {
      query['conditions.cities'] = req.query.city;
    }

    const [rules, total] = await Promise.all([
      MarginRule.find(query)
        .populate('createdBy', 'name email')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit)
        .skip(skip),
      MarginRule.countDocuments(query)
    ]);

    successResponse(res, {
      rules,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRules: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }, 'Margin rules retrieved successfully');
  } catch (error) {
    console.error('Error fetching margin rules:', error);
    errorResponse(res, 'Failed to fetch margin rules', 500);
  }
});

// Get margin statistics
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const stats = await MarginService.getMarginStats();
    successResponse(res, stats, 'Margin statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching margin stats:', error);
    errorResponse(res, 'Failed to fetch margin statistics', 500);
  }
});

// Get a single margin rule
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const rule = await MarginRule.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!rule) {
      return errorResponse(res, 'Margin rule not found', 404);
    }

    successResponse(res, { rule }, 'Margin rule retrieved successfully');
  } catch (error) {
    console.error('Error fetching margin rule:', error);
    errorResponse(res, 'Failed to fetch margin rule', 500);
  }
});

// Create a new margin rule
router.post('/', protect, admin, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('type').isIn(['percentage', 'fixed', 'hybrid']).withMessage('Invalid margin type'),
  body('value').isFloat({ min: 0, max: 100 }).withMessage('Value must be between 0 and 100'),
  body('priority').optional().isInt({ min: 0, max: 100 }).withMessage('Priority must be 0-100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const {
      name,
      description,
      type,
      value,
      fixedAmount,
      currency,
      priority,
      conditions
    } = req.body;

    // Check for duplicate name
    const existingRule = await MarginRule.findOne({ name: name.trim() });
    if (existingRule) {
      return errorResponse(res, 'A rule with this name already exists', 400);
    }

    const rule = new MarginRule({
      name: name.trim(),
      description: description?.trim(),
      type,
      value,
      fixedAmount: fixedAmount || 0,
      currency: currency || 'SAR',
      priority: priority || 0,
      conditions: conditions || {},
      createdBy: req.user._id
    });

    await rule.save();

    // Clear search cache so new margins are applied immediately
    try {
      const RateHawkService = require('../utils/RateHawkService');
      RateHawkService.clearSearchCache();
      MarginService.invalidateCache(); // Also invalidate rule cache
    } catch (err) {
      console.error('Error clearing cache:', err.message);
    }

    successResponse(res, { rule }, 'Margin rule created successfully', 201);
  } catch (error) {
    console.error('Error creating margin rule:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    errorResponse(res, 'Failed to create margin rule', 500);
  }
});

// Update a margin rule
router.put('/:id', protect, admin, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('type').optional().isIn(['percentage', 'fixed', 'hybrid']).withMessage('Invalid margin type'),
  body('value').optional().isFloat({ min: 0, max: 100 }).withMessage('Value must be between 0 and 100'),
  body('priority').optional().isInt({ min: 0, max: 100 }).withMessage('Priority must be 0-100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const rule = await MarginRule.findById(req.params.id);
    if (!rule) {
      return errorResponse(res, 'Margin rule not found', 404);
    }

    const updateFields = ['name', 'description', 'type', 'value', 'fixedAmount', 'currency', 'priority', 'status', 'conditions'];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        rule[field] = req.body[field];
      }
    });

    rule.updatedBy = req.user._id;
    await rule.save();

    // Clear search cache so new margins are applied immediately
    try {
      const RateHawkService = require('../utils/RateHawkService');
      RateHawkService.clearSearchCache();
      MarginService.invalidateCache(); // Also invalidate rule cache
    } catch (err) {
      console.error('Error clearing cache:', err.message);
    }

    successResponse(res, { rule }, 'Margin rule updated successfully');
  } catch (error) {
    console.error('Error updating margin rule:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    errorResponse(res, 'Failed to update margin rule', 500);
  }
});

// Delete a margin rule
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const rule = await MarginRule.findById(req.params.id);
    if (!rule) {
      return errorResponse(res, 'Margin rule not found', 404);
    }

    await MarginRule.findByIdAndDelete(req.params.id);

    // Clear search cache so margins are recalculated
    try {
      const RateHawkService = require('../utils/RateHawkService');
      RateHawkService.clearSearchCache();
      MarginService.invalidateCache(); // Also invalidate rule cache
    } catch (err) {
      console.error('Error clearing cache:', err.message);
    }

    successResponse(res, {}, 'Margin rule deleted successfully');
  } catch (error) {
    console.error('Error deleting margin rule:', error);
    errorResponse(res, 'Failed to delete margin rule', 500);
  }
});

// Toggle rule status (activate/deactivate)
router.patch('/:id/toggle', protect, admin, async (req, res) => {
  try {
    const rule = await MarginRule.findById(req.params.id);
    if (!rule) {
      return errorResponse(res, 'Margin rule not found', 404);
    }

    rule.status = rule.status === 'active' ? 'inactive' : 'active';
    rule.updatedBy = req.user._id;
    await rule.save();

    // Clear search cache so status change takes effect immediately
    try {
      const RateHawkService = require('../utils/RateHawkService');
      RateHawkService.clearSearchCache();
      MarginService.invalidateCache(); // Also invalidate rule cache
    } catch (err) {
      console.error('Error clearing cache:', err.message);
    }

    successResponse(res, { rule }, `Margin rule ${rule.status === 'active' ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    console.error('Error toggling margin rule:', error);
    errorResponse(res, 'Failed to toggle margin rule status', 500);
  }
});

// Simulate margin calculation for testing
router.post('/simulate', protect, admin, async (req, res) => {
  try {
    const { basePrice, country, city, starRating, checkInDate, mealType, customerType } = req.body;

    if (!basePrice || basePrice <= 0) {
      return errorResponse(res, 'Valid base price is required', 400);
    }

    const marginInfo = await MarginService.getApplicableMargin({
      country,
      city,
      starRating,
      bookingValue: basePrice,
      checkInDate,
      mealType,
      customerType
    });

    const result = MarginService.applyMargin(basePrice, marginInfo);

    successResponse(res, {
      input: { basePrice, country, city, starRating, checkInDate, mealType, customerType },
      appliedRule: marginInfo.rule ? {
        id: marginInfo.rule._id,
        name: marginInfo.rule.name,
        type: marginInfo.rule.type,
        value: marginInfo.rule.value
      } : null,
      isDefaultMargin: marginInfo.isDefault,
      calculation: result
    }, 'Margin simulation completed');
  } catch (error) {
    console.error('Error simulating margin:', error);
    errorResponse(res, 'Failed to simulate margin', 500);
  }
});

// Reorder priorities (bulk update)
router.post('/reorder', protect, admin, async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return errorResponse(res, 'Invalid order data', 400);
    }

    // Update priorities based on array order
    const updates = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { priority: orderedIds.length - index } // Higher index = higher priority
      }
    }));

    await MarginRule.bulkWrite(updates);

    successResponse(res, {}, 'Rule priorities updated successfully');
  } catch (error) {
    console.error('Error reordering rules:', error);
    errorResponse(res, 'Failed to reorder rules', 500);
  }
});

module.exports = router;
