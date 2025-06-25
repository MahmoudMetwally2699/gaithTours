const mongoose = require('mongoose');

const whatsAppConversationSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerName: {
    type: String,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  lastMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppMessage'
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
  unreadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalMessages: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVip: {
    type: Boolean,
    default: false,
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  assignedToAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  businessHoursResponse: {
    type: Boolean,
    default: true
  },
  autoReplyEnabled: {
    type: Boolean,
    default: false
  },
  lastAutoReplyAt: {
    type: Date
  },
  metadata: {
    profilePicUrl: String,
    businessName: String,
    customerType: {
      type: String,
      enum: ['new', 'returning', 'vip'],
      default: 'new'
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'ar'],
      default: 'en'
    },
    lastSeenAt: Date,
    notes: String
  }
}, {
  timestamps: true
});

// Indexes for performance
whatsAppConversationSchema.index({ lastMessageAt: -1 });
whatsAppConversationSchema.index({ unreadCount: -1 });
whatsAppConversationSchema.index({ isActive: 1, lastMessageAt: -1 });
whatsAppConversationSchema.index({ assignedToAdmin: 1, isActive: 1 });

// Virtual for getting customer info
whatsAppConversationSchema.virtual('customerInfo').get(function() {
  return {
    name: this.customerName || this.phoneNumber,
    phone: this.phoneNumber,
    isRegistered: !!this.userId,
    isVip: this.isVip
  };
});

// Method to update conversation stats
whatsAppConversationSchema.methods.updateStats = async function() {
  const WhatsAppMessage = mongoose.model('WhatsAppMessage');

  const stats = await WhatsAppMessage.aggregate([
    { $match: { conversationId: this._id } },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$direction', 'incoming'] }, { $eq: ['$isRead', false] }] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  if (stats.length > 0) {
    this.totalMessages = stats[0].totalMessages;
    this.unreadCount = stats[0].unreadCount;
  }
  return this.save();
};

// Static method to find or create conversation
whatsAppConversationSchema.statics.findOrCreate = async function(phoneNumber) {
  let conversation = await this.findOne({ phoneNumber });

  if (!conversation) {
    // Try to link with existing user
    const User = mongoose.model('User');
    const user = await User.findOne({ phone: phoneNumber });

    conversation = new this({
      phoneNumber,
      userId: user ? user._id : null,
      customerName: user ? (user.name || user.firstName + ' ' + user.lastName) : ''
    });

    await conversation.save();
  }

  return conversation;
};

module.exports = mongoose.model('WhatsAppConversation', whatsAppConversationSchema);
