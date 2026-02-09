const express = require('express');
const { protect } = require('../middleware/auth');
const PriceAlert = require('../models/PriceAlert');
const router = express.Router();

/**
 * GET /api/price-alerts
 * Get all price alerts for the authenticated user
 */
router.get('/', protect, async (req, res) => {
  try {
    const alerts = await PriceAlert.find({
      userId: req.user._id,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching price alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price alerts'
    });
  }
});

/**
 * GET /api/price-alerts/all
 * Get all price alerts including inactive ones
 */
router.get('/all', protect, async (req, res) => {
  try {
    const alerts = await PriceAlert.find({
      userId: req.user._id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching all price alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price alerts'
    });
  }
});

/**
 * POST /api/price-alerts
 * Create a new price alert
 */
router.post('/', protect, async (req, res) => {
  try {
    const {
      hotelId,
      hotelName,
      hotelImage,
      destination,
      checkIn,
      checkOut,
      adults,
      children,
      targetPrice,
      currentPrice,
      currency
    } = req.body;

    // Validate required fields
    if (!hotelId || !hotelName || !destination || !checkIn || !checkOut || !currentPrice) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: hotelId, hotelName, destination, checkIn, checkOut, currentPrice'
      });
    }

    // Check if alert already exists for this hotel + dates
    const existingAlert = await PriceAlert.findOne({
      userId: req.user._id,
      hotelId,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut)
    });

    if (existingAlert) {
      // Reactivate if inactive
      if (!existingAlert.isActive) {
        existingAlert.isActive = true;
        existingAlert.currentPrice = currentPrice;
        existingAlert.lowestPrice = Math.min(existingAlert.lowestPrice, currentPrice);
        existingAlert.priceHistory.push({ price: currentPrice, date: new Date() });
        await existingAlert.save();

        return res.json({
          success: true,
          data: existingAlert,
          message: 'Price alert reactivated'
        });
      }

      return res.status(409).json({
        success: false,
        message: 'You are already watching this hotel for these dates'
      });
    }

    // Create new alert
    const alert = new PriceAlert({
      userId: req.user._id,
      hotelId,
      hotelName,
      hotelImage,
      destination,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      adults: adults || 2,
      children: children || 0,
      targetPrice: targetPrice || null,
      initialPrice: currentPrice,
      currentPrice,
      lowestPrice: currentPrice,
      currency: currency || 'USD',
      notifyVia: ['email'],
      priceHistory: [{ price: currentPrice, date: new Date() }]
    });

    await alert.save();

    res.status(201).json({
      success: true,
      data: alert,
      message: 'Price alert created successfully'
    });
  } catch (error) {
    console.error('Error creating price alert:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You are already watching this hotel for these dates'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create price alert'
    });
  }
});

/**
 * PATCH /api/price-alerts/:id
 * Update a price alert (target price, notification method)
 */
router.patch('/:id', protect, async (req, res) => {
  try {
    const { targetPrice, notifyVia, isActive } = req.body;

    const alert = await PriceAlert.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Price alert not found'
      });
    }

    // Update allowed fields
    if (targetPrice !== undefined) alert.targetPrice = targetPrice;
    if (notifyVia !== undefined) alert.notifyVia = notifyVia;
    if (isActive !== undefined) alert.isActive = isActive;

    await alert.save();

    res.json({
      success: true,
      data: alert,
      message: 'Price alert updated'
    });
  } catch (error) {
    console.error('Error updating price alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update price alert'
    });
  }
});

/**
 * DELETE /api/price-alerts/:id
 * Delete (deactivate) a price alert
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const alert = await PriceAlert.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Price alert not found'
      });
    }

    // Soft delete - just deactivate
    alert.isActive = false;
    await alert.save();

    res.json({
      success: true,
      message: 'Price alert removed'
    });
  } catch (error) {
    console.error('Error deleting price alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete price alert'
    });
  }
});

/**
 * GET /api/price-alerts/check/:hotelId
 * Check if user is watching a specific hotel
 */
router.get('/check/:hotelId', protect, async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;

    const query = {
      userId: req.user._id,
      hotelId: req.params.hotelId,
      isActive: true
    };

    // If dates provided, check for specific date range
    if (checkIn && checkOut) {
      query.checkIn = new Date(checkIn);
      query.checkOut = new Date(checkOut);
    }

    const alert = await PriceAlert.findOne(query);

    res.json({
      success: true,
      isWatching: !!alert,
      data: alert
    });
  } catch (error) {
    console.error('Error checking price alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check price alert status'
    });
  }
});

module.exports = router;
