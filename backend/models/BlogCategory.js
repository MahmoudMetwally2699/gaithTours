const mongoose = require('mongoose');

const blogCategorySchema = new mongoose.Schema({
  name: {
    en: { type: String, required: true },
    ar: { type: String, required: true }
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' }
  },
  icon: {
    type: String,
    default: 'globe'  // Icon identifier for frontend
  },
  color: {
    type: String,
    default: '#E67915'  // Orange brand color
  },
  image: {
    type: String,
    default: null
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  postCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save: generate slug from English name
blogCategorySchema.pre('save', function(next) {
  if (this.isModified('name.en') && !this.slug) {
    this.slug = this.name.en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  next();
});

// Index for faster queries
blogCategorySchema.index({ slug: 1 });
blogCategorySchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('BlogCategory', blogCategorySchema);
