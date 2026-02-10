const mongoose = require('mongoose');

const supportChatMessageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportChat',
    required: true,
    index: true
  },
  sender: {
    type: String,
    enum: ['user', 'admin'],
    required: true
  },
  senderUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
supportChatMessageSchema.index({ chatId: 1, createdAt: 1 });
supportChatMessageSchema.index({ chatId: 1, isRead: 1 });

module.exports = mongoose.model('SupportChatMessage', supportChatMessageSchema);
