const mongoose = require('mongoose');

const promotionalBannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  publicId: {
    type: String,
    required: false // Cloudinary public ID for deletion
  },
  linkUrl: {
    type: String,
    required: false,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying of active banners sorted by order
promotionalBannerSchema.index({ isActive: 1, order: 1 });

const PromotionalBanner = mongoose.model('PromotionalBanner', promotionalBannerSchema);

module.exports = PromotionalBanner;
