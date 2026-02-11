const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

/**
 * Initialize web-push with VAPID keys
 */
const initializeWebPush = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@gaithtours.com';

  if (!publicKey || !privateKey) {
    console.warn('⚠️  VAPID keys not configured. Push notifications will not work.');
    console.warn('   Generate keys with: npx web-push generate-vapid-keys');
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  console.log('✅ Web Push initialized with VAPID keys');
  return true;
};

/**
 * Send push notification to a specific user (all their active subscriptions)
 */
const sendPushNotification = async (userId, payload) => {
  try {
    console.log(`🔔 Push to user: Looking for subscriptions with userId=${userId}`);
    const subscriptions = await PushSubscription.find({
      userId,
      isActive: true
    });

    console.log(`🔔 Push to user: Found ${subscriptions.length} active subscriptions`);
    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Gaith Tours',
      body: payload.body || '',
      icon: payload.icon || '/logo-no-background.png',
      badge: '/logo-no-background.png',
      url: payload.url || '/',
      tag: payload.tag || 'default',
      data: payload.data || {}
    });

    let sent = 0;
    let failed = 0;

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, notificationPayload);
          sent++;
        } catch (error) {
          failed++;
          // Handle expired or invalid subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription no longer valid, mark as inactive
            await PushSubscription.findByIdAndUpdate(sub._id, { isActive: false });
            console.log(`🔕 Deactivated expired push subscription for user ${userId}`);
          } else {
            console.error(`Push notification error for user ${userId}:`, error.message);
          }
        }
      })
    );

    return { sent, failed };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { sent: 0, failed: 0, error: error.message };
  }
};

/**
 * Send push notification to ALL active subscribers (for broadcasts like promo announcements)
 */
const sendPushToAll = async (payload) => {
  try {
    const subscriptions = await PushSubscription.find({ isActive: true });

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0, total: 0 };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Gaith Tours',
      body: payload.body || '',
      icon: payload.icon || '/logo-no-background.png',
      badge: '/logo-no-background.png',
      url: payload.url || '/',
      tag: payload.tag || 'broadcast',
      data: payload.data || {}
    });

    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, notificationPayload);
          sent++;
        } catch (error) {
          failed++;
          if (error.statusCode === 410 || error.statusCode === 404) {
            await PushSubscription.findByIdAndUpdate(sub._id, { isActive: false });
          }
        }
      })
    );

    return { sent, failed, total: subscriptions.length };
  } catch (error) {
    console.error('Error sending broadcast push:', error);
    return { sent: 0, failed: 0, error: error.message };
  }
};

/**
 * Send push notification to all admin users (admin, super_admin, sub_admin)
 */
const sendPushToAdmins = async (payload) => {
  try {
    const User = require('../models/User');
    const adminUsers = await User.find({
      role: { $in: ['admin', 'super_admin', 'sub_admin'] }
    }).select('_id role');

    console.log(`🔔 Push to admins: Found ${adminUsers.length} admin users`, adminUsers.map(u => ({ id: u._id, role: u.role })));

    if (adminUsers.length === 0) return { sent: 0, failed: 0 };

    const adminIds = adminUsers.map(u => u._id);
    const subscriptions = await PushSubscription.find({
      userId: { $in: adminIds },
      isActive: true
    });

    console.log(`🔔 Push to admins: Found ${subscriptions.length} active subscriptions`);

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Gaith Tours - Support',
      body: payload.body || '',
      icon: payload.icon || '/logo-no-background.png',
      badge: '/logo-no-background.png',
      url: payload.url || '/admin/support',
      tag: payload.tag || 'support-chat',
      data: payload.data || {}
    });

    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, notificationPayload);
          sent++;
        } catch (error) {
          failed++;
          if (error.statusCode === 410 || error.statusCode === 404) {
            await PushSubscription.findByIdAndUpdate(sub._id, { isActive: false });
          }
        }
      })
    );

    return { sent, failed };
  } catch (error) {
    console.error('Error sending push to admins:', error);
    return { sent: 0, failed: 0, error: error.message };
  }
};

/**
 * Send push notification to a guest user by guestId
 */
const sendPushToGuest = async (guestId, payload) => {
  try {
    console.log(`🔔 Push to guest: Looking for subscriptions with guestId=${guestId}`);
    const subscriptions = await PushSubscription.find({
      guestId,
      isActive: true
    });

    console.log(`🔔 Push to guest: Found ${subscriptions.length} active subscriptions`);
    if (subscriptions.length === 0) return { sent: 0, failed: 0 };

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Gaith Tours',
      body: payload.body || '',
      icon: payload.icon || '/logo-no-background.png',
      badge: '/logo-no-background.png',
      url: payload.url || '/',
      tag: payload.tag || 'default',
      data: payload.data || {}
    });

    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, notificationPayload);
          sent++;
        } catch (error) {
          failed++;
          if (error.statusCode === 410 || error.statusCode === 404) {
            await PushSubscription.findByIdAndUpdate(sub._id, { isActive: false });
          }
        }
      })
    );

    return { sent, failed };
  } catch (error) {
    console.error('Error sending push to guest:', error);
    return { sent: 0, failed: 0, error: error.message };
  }
};

module.exports = {
  initializeWebPush,
  sendPushNotification,
  sendPushToAll,
  sendPushToAdmins,
  sendPushToGuest
};
