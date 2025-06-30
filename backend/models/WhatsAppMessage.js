const mongoose = require('mongoose');

const whatsAppMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  from: {
    type: String,
    required: true,
    index: true
  },
  to: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'document', 'audio', 'video', 'location', 'contact', 'sticker'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  isReplied: {
    type: Boolean,
    default: false,
    index: true
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },  metadata: {
    media_id: String,
    media_url: String,
    mime_type: String,
    file_size: Number,
    caption: String,
    filename: String,
    cloudinary_public_id: String,
    location: {
      latitude: Number,
      longitude: Number,
      name: String,
      address: String
    },
    contact: {
      name: String,
      phone: String
    }
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppConversation',
    required: true,
    index: true
  },
  repliedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppMessage'
  },
  adminUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  errorMessage: String
}, {
  timestamps: true
});

// Indexes for performance
whatsAppMessageSchema.index({ from: 1, timestamp: -1 });
whatsAppMessageSchema.index({ conversationId: 1, timestamp: 1 });
whatsAppMessageSchema.index({ isRead: 1, timestamp: -1 });
whatsAppMessageSchema.index({ direction: 1, timestamp: -1 });

module.exports = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
