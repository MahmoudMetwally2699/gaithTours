const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  guestId: {
    type: String,
    default: null,
    index: true
  },
  subscription: {
    endpoint: {
      type: String,
      required: true
    },
    keys: {
      p256dh: {
        type: String,
        required: true
      },
      auth: {
        type: String,
        required: true
      }
    }
  },
  userAgent: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Unique index by endpoint (one subscription per browser regardless of user)
pushSubscriptionSchema.index(
  { 'subscription.endpoint': 1 },
  { unique: true }
);

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
