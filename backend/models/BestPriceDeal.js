const mongoose = require('mongoose');

const bestPriceDealSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  titleAr: {
    type: String,
    trim: true,
    maxlength: [150, 'Arabic title cannot exceed 150 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  descriptionAr: {
    type: String,
    trim: true,
    maxlength: [500, 'Arabic description cannot exceed 500 characters']
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  publicId: {
    type: String,
    required: false // Cloudinary public ID for deletion
  },
  hotels: [{
    hotelId: {
      type: String,
      required: true
    },
    hotelName: {
      type: String,
      required: true
    },
    hotelNameAr: {
      type: String,
      default: ''
    },
    hotelImage: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    rating: {
      type: Number,
      default: 0
    },
    starRating: {
      type: Number,
      default: 0
    }
  }],
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

bestPriceDealSchema.index({ isActive: 1, order: 1 });

const BestPriceDeal = mongoose.model('BestPriceDeal', bestPriceDealSchema);

module.exports = BestPriceDeal;
