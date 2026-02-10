const express = require('express');
const { protect } = require('../middleware/auth');
const PushSubscription = require('../models/PushSubscription');
const { sendPushNotification } = require('../utils/pushService');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

/**
 * Optional auth middleware for push routes
 * Authenticates if token present, otherwise uses x-guest-id
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
        return next();
      }
    }
  } catch (err) {
    // Token invalid — fall through to guest
  }

  const guestId = req.headers['x-guest-id'];
  if (guestId) {
    req.guestId = guestId;
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication or guest ID required'
  });
};

/**
 * POST /api/push/subscribe
 * Save a push subscription for authenticated user or guest
 */
router.post('/subscribe', optionalAuth, async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription object'
      });
    }

    const updateData = {
      subscription,
      userAgent: userAgent || req.headers['user-agent'] || '',
      isActive: true
    };

    const queryData = {
      'subscription.endpoint': subscription.endpoint
    };

    if (req.user) {
      updateData.userId = req.user._id;
      updateData.guestId = null;
    } else {
      updateData.guestId = req.guestId;
      updateData.userId = null;
    }

    console.log(`🔔 Subscribe: user=${req.user?._id || 'none'}, guest=${req.guestId || 'none'}, endpoint=${subscription.endpoint.substring(0, 60)}...`);

    // Upsert: update if exists, create if not
    const result = await PushSubscription.findOneAndUpdate(
      queryData,
      updateData,
      {
        upsert: true,
        new: true
      }
    );

    console.log(`🔔 Subscribe: Saved subscription ${result._id}, userId=${result.userId}, guestId=${result.guestId}, active=${result.isActive}`);

    res.status(201).json({
      success: true,
      message: 'Push subscription saved',
      data: { id: result._id }
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save push subscription'
    });
  }
});

/**
 * DELETE /api/push/unsubscribe
 * Remove a push subscription
 */
router.delete('/unsubscribe', optionalAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint is required'
      });
    }

    await PushSubscription.findOneAndUpdate(
      { 'subscription.endpoint': endpoint },
      { isActive: false }
    );

    res.json({
      success: true,
      message: 'Push subscription removed'
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove push subscription'
    });
  }
});

/**
 * GET /api/push/status
 * Check if user/guest has active push subscriptions
 */
router.get('/status', optionalAuth, async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.user) {
      query.userId = req.user._id;
    } else {
      query.guestId = req.guestId;
    }

    const count = await PushSubscription.countDocuments(query);

    res.json({
      success: true,
      data: {
        isSubscribed: count > 0,
        subscriptionCount: count
      }
    });
  } catch (error) {
    console.error('Error checking push status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check push status'
    });
  }
});

/**
 * GET /api/push/vapid-key
 * Get the public VAPID key (needed for client-side subscription)
 */
router.get('/vapid-key', (req, res) => {
  const vapidKey = process.env.VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return res.status(500).json({
      success: false,
      message: 'VAPID key not configured'
    });
  }

  res.json({
    success: true,
    data: { publicKey: vapidKey }
  });
});

/**
 * POST /api/push/test
 * Send a test notification to self
 */
router.post('/test', optionalAuth, async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.user) {
      query.userId = req.user._id;
    } else {
      query.guestId = req.guestId;
    }

    const subscriptions = await PushSubscription.find(query);

    if (subscriptions.length === 0) {
      return res.json({
        success: true,
        message: 'No active subscriptions',
        data: { sent: 0, failed: 0 }
      });
    }

    const webpush = require('web-push');
    const payload = JSON.stringify({
      title: '🔔 Test Notification',
      body: 'Push notifications are working! - Gaith Tours',
      icon: '/logo192.png',
      badge: '/logo192.png',
      url: '/',
      tag: 'test'
    });

    let sent = 0;
    let failed = 0;
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          sent++;
        } catch (error) {
          failed++;
          if (error.statusCode === 410 || error.statusCode === 404) {
            await PushSubscription.findByIdAndUpdate(sub._id, { isActive: false });
          }
        }
      })
    );

    res.json({
      success: true,
      message: 'Test notification sent',
      data: { sent, failed }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

module.exports = router;
