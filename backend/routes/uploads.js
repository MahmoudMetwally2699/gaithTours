const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { protect } = require('../middleware/auth');
const { successResponse, errorResponse, sanitizeFilenameForCloudinary } = require('../utils/helpers');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for PDFs and images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Upload single file
router.post('/upload', protect, upload.single('attachment'), async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    // Determine if file is PDF or image
    const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';    // Determine resource type for Cloudinary - use 'image' for PDFs following Cloudinary best practices
    const resourceType = fileType === 'pdf' ? 'image' : 'image';

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      let uploadOptions = {
        resource_type: resourceType,
        folder: 'hotel_bookings_attachments',
        public_id: `${Date.now()}_${sanitizeFilenameForCloudinary(req.file.originalname)}`,
        use_filename: true,
        unique_filename: false,
      };

      // For PDFs, use proper PDF handling following Cloudinary recommendations
      if (fileType === 'pdf') {
        uploadOptions = {
          resource_type: 'image', // Use 'image' for PDFs to enable transformations
          format: 'pdf', // Explicitly specify PDF format
          public_id: `hotel_bookings_${Date.now()}_${sanitizeFilenameForCloudinary(req.file.originalname)}`,
          pages: true, // Enable page extraction for PDFs
          quality: 'auto', // Optimize file size
          flags: 'attachment' // Force download behavior
        };
      }

      // Use stream upload for all file types (recommended approach)
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(error);
          } else {

            resolve(result);
          }
        }
      );
        uploadStream.end(req.file.buffer);
    });

    const attachmentData = {
      fileName: req.file.originalname,
      fileUrl: uploadResult.secure_url,
      fileType: fileType,
      publicId: uploadResult.public_id,
      size: req.file.size,
      uploadedAt: new Date()
    };

    successResponse(res, { attachment: attachmentData }, 'File uploaded successfully');

  } catch (error) {
    console.error('File upload error:', error);

    if (error.message.includes('Invalid file type')) {
      return errorResponse(res, error.message, 400);
    }

    if (error.message.includes('File too large')) {
      return errorResponse(res, 'File too large. Maximum size is 10MB.', 400);
    }

    errorResponse(res, 'Failed to upload file', 500);
  }
});

// Upload multiple files
router.post('/upload-multiple', protect, upload.array('attachments', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return errorResponse(res, 'No files uploaded', 400);
    }    const uploadPromises = req.files.map(async (file) => {
      const fileType = file.mimetype === 'application/pdf' ? 'pdf' : 'image';
      const resourceType = fileType === 'pdf' ? 'image' : 'image'; // Use 'image' for PDFs

      const uploadResult = await new Promise((resolve, reject) => {
        let uploadOptions = {
          resource_type: resourceType,
          folder: 'hotel_bookings_attachments',
          public_id: `${Date.now()}_${sanitizeFilenameForCloudinary(file.originalname)}`,
          use_filename: true,
          unique_filename: false,
        };

        // For PDFs, use proper PDF handling following Cloudinary recommendations
        if (fileType === 'pdf') {
          uploadOptions = {
            resource_type: 'image', // Use 'image' for PDFs to enable transformations
            format: 'pdf', // Explicitly specify PDF format
            public_id: `hotel_bookings_${Date.now()}_${sanitizeFilenameForCloudinary(file.originalname)}`,
            pages: true, // Enable page extraction for PDFs
            quality: 'auto', // Optimize file size
            flags: 'attachment' // Force download behavior
          };
        }

        // Use stream upload for all file types (recommended approach)
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', error);
              reject(error);
            } else {

              resolve(result);
            }
          }
        );

        uploadStream.end(file.buffer);
      });      return {
        fileName: file.originalname,
        fileUrl: uploadResult.secure_url,
        fileType: fileType,
        publicId: uploadResult.public_id,
        size: file.size,
        uploadedAt: new Date()
      };
    });

    const attachments = await Promise.all(uploadPromises);

    successResponse(res, { attachments }, 'Files uploaded successfully');

  } catch (error) {
    console.error('Multiple file upload error:', error);

    if (error.message.includes('Invalid file type')) {
      return errorResponse(res, error.message, 400);
    }

    if (error.message.includes('File too large')) {
      return errorResponse(res, 'One or more files are too large. Maximum size is 10MB per file.', 400);
    }

    errorResponse(res, 'Failed to upload files', 500);
  }
});

// Delete file from Cloudinary
router.delete('/delete/:publicId', protect, async (req, res) => {
  try {
    const { publicId } = req.params;

    // Determine resource type from publicId
    const resourceType = publicId.includes('.pdf') ? 'raw' : 'image';

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    successResponse(res, null, 'File deleted successfully');
  } catch (error) {
    console.error('File deletion error:', error);
    errorResponse(res, 'Failed to delete file', 500);
  }
});

module.exports = router;
