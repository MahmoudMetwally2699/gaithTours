/**
 * Price Alert Service
 * Background job to check hotel prices and send notifications when prices drop
 */

const PriceAlert = require('../models/PriceAlert');
const User = require('../models/User');
const rateHawkService = require('./RateHawkService');
const { sendPriceAlertEmail } = require('./emailService');
const { sendPushNotification } = require('./pushService');

// Minimum price drop percentage to trigger notification
const MIN_PRICE_DROP_PERCENT = 5;

// Minimum time between notifications for the same alert (24 hours)
const MIN_NOTIFICATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Check a single price alert and send notification if price dropped
 */
async function checkSingleAlert(alert) {
  try {
    // Get user details for notification
    const user = await User.findById(alert.userId);
    if (!user) {
      console.log(`❌ User not found for alert ${alert._id}, deactivating...`);
      alert.isActive = false;
      await alert.save();
      return { success: false, reason: 'User not found' };
    }

    // Check if dates are still valid (not in the past)
    const now = new Date();
    if (new Date(alert.checkIn) < now) {
      console.log(`📅 Alert ${alert._id} has past dates, deactivating...`);
      alert.isActive = false;
      await alert.save();
      return { success: false, reason: 'Past dates' };
    }

    // Fetch current price from RateHawk
    console.log(`🔍 Checking price for ${alert.hotelName}...`);

    const searchParams = {
      destination: alert.destination,
      checkIn: alert.checkIn.toISOString().split('T')[0],
      checkOut: alert.checkOut.toISOString().split('T')[0],
      adults: alert.adults,
      children: alert.children,
      currency: alert.currency,
      language: 'en'
    };

    // Use hotel search to get updated price
    let newPrice = null;

    try {
      // Try to get hotel details with current pricing
      const hotelDetails = await rateHawkService.getHotelDetails(
        alert.hotelId,
        searchParams.checkIn,
        searchParams.checkOut,
        { adults: searchParams.adults },
        searchParams.currency,
        'en'
      );

      if (hotelDetails && hotelDetails.rooms && hotelDetails.rooms.length > 0) {
        // Get the lowest room price
        newPrice = Math.min(...hotelDetails.rooms.map(room => room.price || Infinity));
        if (newPrice === Infinity) newPrice = null;
      }
    } catch (error) {
      console.error(`Failed to fetch hotel details for ${alert.hotelId}:`, error.message);
      // Try alternative search method
      try {
        const searchResults = await rateHawkService.searchHotels({
          ...searchParams,
          hotelId: alert.hotelId
        });

        if (searchResults && searchResults.hotels) {
          const hotel = searchResults.hotels.find(h => h.id === alert.hotelId);
          if (hotel && hotel.price) {
            newPrice = hotel.price;
          }
        }
      } catch (searchError) {
        console.error(`Alternative search also failed:`, searchError.message);
      }
    }

    if (!newPrice) {
      console.log(`⚠️ Could not fetch price for ${alert.hotelName}`);
      alert.lastChecked = new Date();
      await alert.save();
      return { success: false, reason: 'Price unavailable' };
    }

    // Update alert with new price data
    const previousPrice = alert.currentPrice;
    alert.currentPrice = newPrice;
    alert.lastChecked = new Date();

    // Add to price history
    alert.priceHistory.push({ price: newPrice, date: new Date() });

    // Keep only last 30 price points
    if (alert.priceHistory.length > 30) {
      alert.priceHistory = alert.priceHistory.slice(-30);
    }

    // Check if this is a new lowest price
    if (newPrice < alert.lowestPrice) {
      alert.lowestPrice = newPrice;
    }

    // Calculate price drop
    const priceDrop = previousPrice - newPrice;
    const priceDropPercent = Math.round((priceDrop / previousPrice) * 100);

    // Determine if we should send notification
    let shouldNotify = false;
    let notifyReason = '';

    if (priceDrop > 0 && priceDropPercent >= MIN_PRICE_DROP_PERCENT) {
      // Check if we've recently notified
      const lastNotified = alert.lastNotified ? new Date(alert.lastNotified).getTime() : 0;
      const timeSinceLastNotification = Date.now() - lastNotified;

      if (timeSinceLastNotification >= MIN_NOTIFICATION_INTERVAL_MS) {
        shouldNotify = true;
        notifyReason = `Price dropped ${priceDropPercent}%`;
      } else {
        notifyReason = 'Recently notified';
      }
    } else if (alert.targetPrice && newPrice <= alert.targetPrice) {
      // Target price reached
      const lastNotified = alert.lastNotified ? new Date(alert.lastNotified).getTime() : 0;
      const timeSinceLastNotification = Date.now() - lastNotified;

      if (timeSinceLastNotification >= MIN_NOTIFICATION_INTERVAL_MS) {
        shouldNotify = true;
        notifyReason = 'Target price reached';
      }
    }

    // Send notification if needed
    if (shouldNotify) {
      console.log(`📧 Sending price alert for ${alert.hotelName} - ${notifyReason}`);

      if (alert.notifyVia.includes('email')) {
        try {
          await sendPriceAlertEmail({
            email: user.email,
            name: user.name,
            hotelName: alert.hotelName,
            hotelImage: alert.hotelImage,
            destination: alert.destination,
            checkIn: alert.checkIn,
            checkOut: alert.checkOut,
            previousPrice: previousPrice,
            newPrice: newPrice,
            lowestPrice: alert.lowestPrice,
            currency: alert.currency,
            priceDrop: priceDrop,
            priceDropPercent: priceDropPercent,
            hotelId: alert.hotelId
          });

          alert.lastNotified = new Date();
          console.log(`✅ Price alert email sent to ${user.email}`);
        } catch (emailError) {
          console.error(`❌ Failed to send price alert email:`, emailError.message);
        }
      }

      // Also send push notification
      try {
        await sendPushNotification(alert.userId, {
          title: `📉 Price Drop: ${alert.hotelName}`,
          body: `Price dropped ${priceDropPercent}%! Now ${alert.currency} ${newPrice} (was ${previousPrice})`,
          url: `/hotel/${alert.hotelId}?checkIn=${searchParams.checkIn}&checkOut=${searchParams.checkOut}`,
          tag: `price-drop-${alert._id}`
        });
      } catch (pushError) {
        console.error(`Failed to send push notification:`, pushError.message);
      }
    }

    await alert.save();

    return {
      success: true,
      hotelName: alert.hotelName,
      previousPrice,
      newPrice,
      priceDrop,
      priceDropPercent,
      notified: shouldNotify,
      notifyReason
    };
  } catch (error) {
    console.error(`Error checking alert ${alert._id}:`, error);
    return { success: false, reason: error.message };
  }
}

/**
 * Check all active price alerts
 * This function should be called periodically (e.g., every 6 hours)
 */
async function checkAllPriceAlerts() {
  console.log('🔔 Starting price alert check...');
  const startTime = Date.now();

  try {
    // Find all active alerts that haven't been checked in the last 4 hours
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const alerts = await PriceAlert.find({
      isActive: true,
      $or: [
        { lastChecked: null },
        { lastChecked: { $lt: fourHoursAgo } }
      ],
      checkIn: { $gte: new Date() } // Only future bookings
    }).limit(50); // Process max 50 alerts per run to avoid overload

    console.log(`📋 Found ${alerts.length} alerts to check`);

    const results = {
      total: alerts.length,
      checked: 0,
      priceDrops: 0,
      notificationsSent: 0,
      errors: 0
    };

    // Process alerts with rate limiting (1 per 2 seconds)
    for (const alert of alerts) {
      try {
        const result = await checkSingleAlert(alert);
        results.checked++;

        if (result.success && result.priceDrop > 0) {
          results.priceDrops++;
        }
        if (result.notified) {
          results.notificationsSent++;
        }
      } catch (error) {
        console.error(`Error processing alert:`, error);
        results.errors++;
      }

      // Rate limiting: wait 2 seconds between API calls
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Price alert check completed in ${duration}s`);
    console.log(`   - Checked: ${results.checked}/${results.total}`);
    console.log(`   - Price drops found: ${results.priceDrops}`);
    console.log(`   - Notifications sent: ${results.notificationsSent}`);
    console.log(`   - Errors: ${results.errors}`);

    return results;
  } catch (error) {
    console.error('❌ Price alert check failed:', error);
    throw error;
  }
}

/**
 * Get price history statistics for a user
 */
async function getUserAlertStats(userId) {
  const alerts = await PriceAlert.find({ userId, isActive: true });

  let totalSavingsOpportunity = 0;
  let activeWatches = alerts.length;
  let priceDropsThisWeek = 0;

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const alert of alerts) {
    // Calculate potential savings (current vs lowest)
    if (alert.currentPrice > alert.lowestPrice) {
      totalSavingsOpportunity += (alert.currentPrice - alert.lowestPrice);
    }

    // Count recent price drops
    const recentHistory = alert.priceHistory.filter(
      h => new Date(h.date) >= oneWeekAgo
    );

    for (let i = 1; i < recentHistory.length; i++) {
      if (recentHistory[i].price < recentHistory[i - 1].price) {
        priceDropsThisWeek++;
      }
    }
  }

  return {
    activeWatches,
    totalSavingsOpportunity,
    priceDropsThisWeek
  };
}

module.exports = {
  checkSingleAlert,
  checkAllPriceAlerts,
  getUserAlertStats,
  MIN_PRICE_DROP_PERCENT,
  MIN_NOTIFICATION_INTERVAL_MS
};
