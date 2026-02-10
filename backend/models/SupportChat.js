const mongoose = require('mongoose');

const supportChatSchema = new mongoose.Schema({
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
  guestName: {
    type: String,
    default: 'Guest',
    trim: true,
    maxlength: 100
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  topic: {
    type: String,
    enum: ['booking', 'payment', 'cancellation', 'general', 'technical', 'other'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastMessagePreview: {
    type: String,
    maxlength: 100
  },
  unreadByUser: {
    type: Number,
    default: 0,
    min: 0
  },
  unreadByAdmin: {
    type: Number,
    default: 1,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
supportChatSchema.index({ status: 1, lastMessageAt: -1 });
supportChatSchema.index({ userId: 1, status: 1 });
supportChatSchema.index({ guestId: 1, status: 1 });
supportChatSchema.index({ assignedAdmin: 1, status: 1 });

module.exports = mongoose.model('SupportChat', supportChatSchema);
