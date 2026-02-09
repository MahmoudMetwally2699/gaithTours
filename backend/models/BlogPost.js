const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  // Bilingual content
  title: {
    en: { type: String, required: true },
    ar: { type: String, default: '' }
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  excerpt: {
    en: { type: String, default: '' },
    ar: { type: String, default: '' }
  },
  content: {
    en: { type: String, required: true },
    ar: { type: String, default: '' }
  },

  // Category reference
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlogCategory',
    default: null
  },

  // Media
  featuredImage: {
    type: String,
    default: ''
  },
  gallery: [{
    type: String
  }],

  // Author info
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Linked hotels for destination guides
  linkedHotels: [{
    hotelId: { type: String },
    hotelName: { type: String },
    hotelImage: { type: String }
  }],

  // Location data for destination guides
  destination: {
    name: { type: String },
    regionId: { type: String },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },

  // Tags for SEO and filtering
  tags: [{
    en: { type: String },
    ar: { type: String }
  }],

  // SEO meta
  metaTitle: {
    en: { type: String },
    ar: { type: String }
  },
  metaDescription: {
    en: { type: String, maxlength: 160 },
    ar: { type: String, maxlength: 160 }
  },
  metaKeywords: {
    en: [{ type: String }],
    ar: [{ type: String }]
  },

  // Publishing status
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  scheduledFor: {
    type: Date
  },

  // Engagement metrics
  viewCount: {
    type: Number,
    default: 0
  },
  readTime: {
    type: Number, // in minutes
    default: 5
  },

  // Featured flag for homepage display
  isFeatured: {
    type: Boolean,
    default: false
  },

  // Order for manual sorting
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save: generate slug from English title
blogPostSchema.pre('save', function(next) {
  if (this.isModified('title.en') && this.isNew) {
    const baseSlug = this.title.en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    this.slug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  // Calculate read time based on content (average 200 words per minute)
  if (this.isModified('content.en')) {
    const wordCount = (this.content.en || '').split(/\s+/).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

// Post-save: update category post count
blogPostSchema.post('save', async function() {
  const BlogCategory = mongoose.model('BlogCategory');
  const count = await mongoose.model('BlogPost').countDocuments({
    category: this.category,
    status: 'published'
  });
  await BlogCategory.findByIdAndUpdate(this.category, { postCount: count });
});

// Indexes for efficient queries
blogPostSchema.index({ slug: 1 });
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, status: 1 });
blogPostSchema.index({ isFeatured: 1, status: 1 });
blogPostSchema.index({ 'destination.name': 1 });
blogPostSchema.index({ tags: 1 });

// Virtual for URL path
blogPostSchema.virtual('url').get(function() {
  return `/blog/${this.slug}`;
});

// Ensure virtuals are included in JSON
blogPostSchema.set('toJSON', { virtuals: true });
blogPostSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BlogPost', blogPostSchema);
