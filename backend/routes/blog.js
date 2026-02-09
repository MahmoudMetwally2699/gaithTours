const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const BlogCategory = require('../models/BlogCategory');

/**
 * Public Blog API Routes
 * No authentication required for reading published content
 */

// Get all published blog posts (paginated)
router.get('/posts', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      featured,
      destination,
      search,
      language = 'en'
    } = req.query;

    const query = { status: 'published' };

    // Filter by category slug
    if (category) {
      const cat = await BlogCategory.findOne({ slug: category });
      if (cat) {
        query.category = cat._id;
      }
    }

    // Filter featured posts
    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Filter by destination
    if (destination) {
      query['destination.name'] = { $regex: destination, $options: 'i' };
    }

    // Search in title and content
    if (search) {
      const langField = language === 'ar' ? 'ar' : 'en';
      query.$or = [
        { [`title.${langField}`]: { $regex: search, $options: 'i' } },
        { [`excerpt.${langField}`]: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await BlogPost.countDocuments(query);
    const posts = await BlogPost.find(query)
      .populate('category', 'name slug color icon')
      .populate('author', 'name avatar')
      .select('-content') // Exclude full content for listing
      .sort({ isFeatured: -1, publishedAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: posts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasMore: parseInt(page) * parseInt(limit) < total
      }
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

// Get single blog post by slug
router.get('/posts/:slug', async (req, res) => {
  try {
    const post = await BlogPost.findOne({
      slug: req.params.slug,
      status: 'published'
    })
      .populate('category', 'name slug color icon')
      .populate('author', 'name avatar');

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Increment view count
    post.viewCount += 1;
    await post.save();

    // Get related posts from same category
    const relatedPosts = await BlogPost.find({
      _id: { $ne: post._id },
      category: post.category._id,
      status: 'published'
    })
      .select('title slug featuredImage readTime publishedAt')
      .limit(3)
      .sort({ publishedAt: -1 });

    res.json({
      success: true,
      data: post,
      related: relatedPosts
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch post' });
  }
});

// Get all active categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await BlogCategory.find({ isActive: true })
      .sort({ order: 1, 'name.en': 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// Get posts by destination (for hotel detail pages)
router.get('/destination/:regionId', async (req, res) => {
  try {
    const posts = await BlogPost.find({
      'destination.regionId': req.params.regionId,
      status: 'published'
    })
      .select('title slug featuredImage excerpt readTime publishedAt')
      .limit(4)
      .sort({ publishedAt: -1 });

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error fetching destination posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

// Get featured posts for homepage
router.get('/featured', async (req, res) => {
  try {
    const { limit = 3 } = req.query;

    const posts = await BlogPost.find({
      isFeatured: true,
      status: 'published'
    })
      .populate('category', 'name slug color')
      .select('title slug featuredImage excerpt readTime publishedAt category')
      .limit(parseInt(limit))
      .sort({ publishedAt: -1 });

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error fetching featured posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch featured posts' });
  }
});

module.exports = router;
