const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { protect, admin } = require('../middleware/auth');
const { successResponse, errorResponse, sanitizeFilenameForCloudinary } = require('../utils/helpers');
const PromotionalBanner = require('../models/PromotionalBanner');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ==================== PUBLIC ROUTES ====================

// Get all active promotional banners (public)
router.get('/', async (req, res) => {
  try {
    const banners = await PromotionalBanner.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select('-publicId');

    successResponse(res, { banners }, 'Promotional banners retrieved successfully');
  } catch (error) {
    console.error('Error fetching promotional banners:', error);
    errorResponse(res, 'Failed to fetch promotional banners', 500);
  }
});

// ==================== ADMIN ROUTES ====================

// Get all banners (admin)
router.get('/admin', protect, admin, async (req, res) => {
  try {
    const banners = await PromotionalBanner.find()
      .sort({ order: 1, createdAt: -1 });

    successResponse(res, { banners }, 'All banners retrieved successfully');
  } catch (error) {
    console.error('Error fetching all banners:', error);
    errorResponse(res, 'Failed to fetch banners', 500);
  }
});

// Create new banner (admin)
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'Image is required', 400);
    }

    const { title, linkUrl } = req.body;

    if (!title) {
      return errorResponse(res, 'Title is required', 400);
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'promotional_banners',
          public_id: `banner_${Date.now()}_${sanitizeFilenameForCloudinary(req.file.originalname)}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Get highest order number
    const highestOrder = await PromotionalBanner.findOne().sort({ order: -1 });
    const newOrder = highestOrder ? highestOrder.order + 1 : 0;

    const banner = new PromotionalBanner({
      title,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      linkUrl: linkUrl || '',
      order: newOrder
    });

    await banner.save();

    successResponse(res, { banner }, 'Banner created successfully', 201);
  } catch (error) {
    console.error('Error creating banner:', error);
    errorResponse(res, 'Failed to create banner', 500);
  }
});

// Update banner (admin)
router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const banner = await PromotionalBanner.findById(req.params.id);
    if (!banner) {
      return errorResponse(res, 'Banner not found', 404);
    }

    const { title, linkUrl, isActive, order } = req.body;

    // Update fields
    if (title) banner.title = title;
    if (linkUrl !== undefined) banner.linkUrl = linkUrl;
    if (isActive !== undefined) banner.isActive = isActive === 'true' || isActive === true;
    if (order !== undefined) banner.order = parseInt(order);

    // If new image uploaded, update it
    if (req.file) {
      // Delete old image from Cloudinary if exists
      if (banner.publicId) {
        try {
          await cloudinary.uploader.destroy(banner.publicId);
        } catch (e) {
          console.warn('Failed to delete old image:', e);
        }
      }

      // Upload new image
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: 'promotional_banners',
            public_id: `banner_${Date.now()}_${sanitizeFilenameForCloudinary(req.file.originalname)}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      banner.imageUrl = uploadResult.secure_url;
      banner.publicId = uploadResult.public_id;
    }

    await banner.save();

    successResponse(res, { banner }, 'Banner updated successfully');
  } catch (error) {
    console.error('Error updating banner:', error);
    errorResponse(res, 'Failed to update banner', 500);
  }
});

// Toggle banner active status (admin)
router.patch('/:id/toggle', protect, admin, async (req, res) => {
  try {
    const banner = await PromotionalBanner.findById(req.params.id);
    if (!banner) {
      return errorResponse(res, 'Banner not found', 404);
    }

    banner.isActive = !banner.isActive;
    await banner.save();

    successResponse(res, { banner }, `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    console.error('Error toggling banner:', error);
    errorResponse(res, 'Failed to toggle banner status', 500);
  }
});

// Delete banner (admin)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const banner = await PromotionalBanner.findById(req.params.id);
    if (!banner) {
      return errorResponse(res, 'Banner not found', 404);
    }

    // Delete image from Cloudinary if exists
    if (banner.publicId) {
      try {
        await cloudinary.uploader.destroy(banner.publicId);
      } catch (e) {
        console.warn('Failed to delete image from Cloudinary:', e);
      }
    }

    await PromotionalBanner.findByIdAndDelete(req.params.id);

    successResponse(res, null, 'Banner deleted successfully');
  } catch (error) {
    console.error('Error deleting banner:', error);
    errorResponse(res, 'Failed to delete banner', 500);
  }
});

// Reorder banners (admin)
router.post('/reorder', protect, admin, async (req, res) => {
  try {
    const { bannerIds } = req.body;

    if (!bannerIds || !Array.isArray(bannerIds)) {
      return errorResponse(res, 'bannerIds array is required', 400);
    }

    // Update order for each banner
    const updatePromises = bannerIds.map((id, index) =>
      PromotionalBanner.findByIdAndUpdate(id, { order: index })
    );

    await Promise.all(updatePromises);

    successResponse(res, null, 'Banners reordered successfully');
  } catch (error) {
    console.error('Error reordering banners:', error);
    errorResponse(res, 'Failed to reorder banners', 500);
  }
});

module.exports = router;
