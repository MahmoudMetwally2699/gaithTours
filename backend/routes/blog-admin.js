const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const BlogCategory = require('../models/BlogCategory');
const { protect, admin } = require('../middleware/auth');

/**
 * Admin Blog API Routes
 * Authentication and admin role required
 */

// All routes require authentication and admin role
router.use(protect);
router.use(admin);

// =====================
// CATEGORY MANAGEMENT
// =====================

// Get all categories (including inactive)
router.get('/categories', async (req, res) => {
  try {
    const categories = await BlogCategory.find()
      .sort({ order: 1, createdAt: -1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const { name, description, icon, color, image, order } = req.body;

    if (!name?.en || !name?.ar) {
      return res.status(400).json({
        success: false,
        error: 'Both English and Arabic names are required'
      });
    }

    const category = new BlogCategory({
      name,
      description,
      icon,
      color,
      image,
      order
    });

    await category.save();

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

// Update category
router.patch('/categories/:id', async (req, res) => {
  try {
    const category = await BlogCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    // Check if there are posts in this category
    const postCount = await BlogPost.countDocuments({ category: req.params.id });

    if (postCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category with ${postCount} posts. Move or delete posts first.`
      });
    }

    const category = await BlogCategory.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({
      success: true,
      message: 'Category deleted'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

// =====================
// POST MANAGEMENT
// =====================

// Get all posts (including drafts)
router.get('/posts', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      search
    } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.ar': { $regex: search, $options: 'i' } }
      ];
    }

    const total = await BlogPost.countDocuments(query);
    const posts = await BlogPost.find(query)
      .populate('category', 'name slug')
      .populate('author', 'name')
      .select('-content') // Exclude full content
      .sort({ updatedAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: posts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

// Get single post (for editing)
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('author', 'name');

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch post' });
  }
});

// Create post
router.post('/posts', async (req, res) => {
  try {
    const {
      title,
      excerpt,
      content,
      category,
      featuredImage,
      gallery,
      linkedHotels,
      destination,
      tags,
      metaTitle,
      metaDescription,
      metaKeywords,
      status,
      scheduledFor,
      isFeatured,
      order
    } = req.body;

    // Validation
    if (!title?.en) {
      return res.status(400).json({
        success: false,
        error: 'English title is required'
      });
    }

    if (!content?.en) {
      return res.status(400).json({
        success: false,
        error: 'English content is required'
      });
    }

    // Note: category and featuredImage are optional for draft posts

    const post = new BlogPost({
      title,
      excerpt,
      content,
      category,
      featuredImage,
      gallery,
      linkedHotels,
      destination,
      tags,
      metaTitle,
      metaDescription,
      metaKeywords,
      status: status || 'draft',
      scheduledFor,
      isFeatured,
      order,
      author: req.user._id
    });

    await post.save();

    // Populate references for response
    await post.populate('category', 'name slug');
    await post.populate('author', 'name');

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// Update post
router.patch('/posts/:id', async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Update fields
    const updateFields = [
      'title', 'excerpt', 'content', 'category', 'featuredImage',
      'gallery', 'linkedHotels', 'destination', 'tags',
      'metaTitle', 'metaDescription', 'metaKeywords',
      'status', 'scheduledFor', 'isFeatured', 'order'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        post[field] = req.body[field];
      }
    });

    await post.save();

    // Populate references for response
    await post.populate('category', 'name slug');
    await post.populate('author', 'name');

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, error: 'Failed to update post' });
  }
});

// Delete post
router.delete('/posts/:id', async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Update category post count
    const BlogCategory = require('../models/BlogCategory');
    const count = await BlogPost.countDocuments({
      category: post.category,
      status: 'published'
    });
    await BlogCategory.findByIdAndUpdate(post.category, { postCount: count });

    res.json({
      success: true,
      message: 'Post deleted'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// Toggle featured status
router.patch('/posts/:id/featured', async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    post.isFeatured = !post.isFeatured;
    await post.save();

    res.json({
      success: true,
      data: { isFeatured: post.isFeatured }
    });
  } catch (error) {
    console.error('Error toggling featured:', error);
    res.status(500).json({ success: false, error: 'Failed to update post' });
  }
});

// Publish draft
router.patch('/posts/:id/publish', async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    post.status = 'published';
    post.publishedAt = new Date();
    await post.save();

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error publishing post:', error);
    res.status(500).json({ success: false, error: 'Failed to publish post' });
  }
});

// Unpublish post
router.patch('/posts/:id/unpublish', async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    post.status = 'draft';
    await post.save();

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error unpublishing post:', error);
    res.status(500).json({ success: false, error: 'Failed to unpublish post' });
  }
});

// Get blog stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      totalCategories,
      totalViews
    ] = await Promise.all([
      BlogPost.countDocuments(),
      BlogPost.countDocuments({ status: 'published' }),
      BlogPost.countDocuments({ status: 'draft' }),
      BlogCategory.countDocuments({ isActive: true }),
      BlogPost.aggregate([
        { $group: { _id: null, total: { $sum: '$viewCount' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalPosts,
        publishedPosts,
        draftPosts,
        totalCategories,
        totalViews: totalViews[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

module.exports = router;
