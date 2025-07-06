const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppConversation = require('../models/WhatsAppConversation');
const User = require('../models/User');
const auth = require('../middleware/auth');
const WhatsAppService = require('../utils/whatsappService');
const { sanitizeFilenameForCloudinary } = require('../utils/helpers');
const { getIO } = require('../socket');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for attachments
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'audio/mpeg', 'audio/mp4', 'audio/wav',
    'video/mp4', 'video/mpeg', 'video/quicktime'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, audio, and video files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB limit for WhatsApp media
  }
});

// Middleware to check admin permissions
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// GET /api/admin/whatsapp/conversations - List all conversations
router.get('/whatsapp/conversations', auth, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      unreadOnly,
      assignedToMe,
      sortBy = 'lastMessageAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { isActive: true };

    // Search filter
    if (search) {
      query.$or = [
        { phoneNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { 'metadata.notes': { $regex: search, $options: 'i' } }
      ];
    }

    // Unread only filter
    if (unreadOnly === 'true') {
      query.unreadCount = { $gt: 0 };
    }

    // Assigned to me filter
    if (assignedToMe === 'true') {
      query.assignedToAdmin = req.user.id;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const conversations = await WhatsAppConversation
      .find(query)
      .populate('userId', 'name email phone nationality')
      .populate('lastMessageId', 'message messageType timestamp direction')
      .populate('assignedToAdmin', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WhatsAppConversation.countDocuments(query);

    res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Error fetching conversations', error: error.message });
  }
});

// GET /api/admin/whatsapp/conversations/:phone/messages - Get messages for specific conversation
router.get('/whatsapp/conversations/:phone/messages', auth, requireAdmin, async (req, res) => {
  try {
    const { phone } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await WhatsAppConversation.findOne({ phoneNumber: phone });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await WhatsAppMessage
      .find({ conversationId: conversation._id })
      .populate('adminUserId', 'name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WhatsAppMessage.countDocuments({ conversationId: conversation._id });

    // Mark incoming messages as read
    await WhatsAppMessage.updateMany(
      {
        conversationId: conversation._id,
        direction: 'incoming',
        isRead: false
      },
      { isRead: true }
    );

    // Update conversation unread count
    await conversation.updateStats();

    // Emit read status update
    const io = getIO();
    if (io) {
      io.emit('messagesMarkedAsRead', {
        conversationId: conversation._id,
        phoneNumber: phone
      });
    }

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Return in chronological order
        conversation,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

// POST /api/admin/whatsapp/reply - Send reply message
router.post('/whatsapp/reply', auth, requireAdmin, async (req, res) => {
  try {
    const { phoneNumber, message, messageType = 'text', replyToMessageId } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ message: 'Phone number and message are required' });
    }

    // Find or create conversation
    let conversation = await WhatsAppConversation.findOne({ phoneNumber });
    if (!conversation) {
      conversation = new WhatsAppConversation({
        phoneNumber,
        customerName: phoneNumber,
      });
      await conversation.save();
    }

    // Send message via WhatsApp API
    const whatsappService = new WhatsAppService();
    const response = await whatsappService.sendMessage(phoneNumber, message);

    if (!response || !response.messages?.[0]?.id) {
      throw new Error('Failed to send WhatsApp message');
    }

    const messageId = response.messages[0].id;

    // Create message record
    const whatsAppMessage = new WhatsAppMessage({
      messageId,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID,
      to: phoneNumber,
      message,
      messageType,
      timestamp: new Date(),
      direction: 'outgoing',
      conversationId: conversation._id,
      adminUserId: req.user.id,
      status: 'sent',
      repliedTo: replyToMessageId || null
    });

    await whatsAppMessage.save();

    // Update conversation
    conversation.lastMessageId = whatsAppMessage._id;
    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = message.substring(0, 100);
    conversation.totalMessages += 1;

    // Mark as replied if this is a response to an incoming message
    if (conversation.unreadCount > 0) {
      await WhatsAppMessage.updateMany(
        {
          conversationId: conversation._id,
          direction: 'incoming',
          isReplied: false
        },
        { isReplied: true }
      );
    }

    await conversation.save();

    // Emit real-time update
    const io = getIO();
    if (io) {
      io.emit('newWhatsAppMessage', {
        message: await whatsAppMessage.populate('adminUserId', 'name email'),
        conversation
      });
    }

    res.json({
      success: true,
      data: {
        message: whatsAppMessage,
        whatsappResponse: response
      }
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({ message: 'Error sending reply', error: error.message });
  }
});

// POST /api/admin/whatsapp/reply-with-attachment - Send reply message with attachment
router.post('/whatsapp/reply-with-attachment', auth, requireAdmin, upload.single('attachment'), async (req, res) => {
  try {
    const { phoneNumber, message = '', replyToMessageId } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!req.file && !message) {
      return res.status(400).json({ message: 'Either attachment or message is required' });
    }

    // Find or create conversation
    let conversation = await WhatsAppConversation.findOne({ phoneNumber });
    if (!conversation) {
      conversation = new WhatsAppConversation({
        phoneNumber,
        customerName: phoneNumber,
      });
      await conversation.save();
    }

    let whatsAppMessage;
    let response;
    const whatsappService = new WhatsAppService();

    // If there's an attachment, upload it and send as media
    if (req.file) {
      // Determine file type and message type
      const isImage = req.file.mimetype.startsWith('image/');
      const isVideo = req.file.mimetype.startsWith('video/');
      const isAudio = req.file.mimetype.startsWith('audio/');
      const isDocument = !isImage && !isVideo && !isAudio;

      let messageType;
      let resourceType;

      if (isImage) {
        messageType = 'image';
        resourceType = 'image';
      } else if (isVideo) {
        messageType = 'video';
        resourceType = 'video';
      } else if (isAudio) {
        messageType = 'audio';
        resourceType = 'raw';
      } else {
        messageType = 'document';
        resourceType = 'raw';
      }      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const sanitizedFilename = sanitizeFilenameForCloudinary(req.file.originalname);


        // Create minimal upload options to avoid conflicts
        let uploadOptions;
          // Set resource type and specific options based on file type
        if (isDocument) {
          uploadOptions = {
            resource_type: 'image', // Use 'image' for PDFs to enable transformations
            format: 'pdf', // Explicitly specify PDF format
            public_id: `whatsapp_doc_${Date.now()}_${sanitizedFilename}`,
            pages: true, // Enable page extraction for PDFs
            quality: 'auto', // Optimize file size
            flags: 'attachment' // Force download behavior for non-image formats
          };
        } else if (isImage) {
          uploadOptions = {
            resource_type: 'image',
            public_id: `whatsapp_img_${Date.now()}_${sanitizedFilename}`,
            quality: 'auto',
            fetch_format: 'auto'
          };
        } else if (isVideo) {
          uploadOptions = {
            resource_type: 'video',
            public_id: `whatsapp_vid_${Date.now()}_${sanitizedFilename}`,
            quality: 'auto'
          };
        } else if (isAudio) {
          uploadOptions = {
            resource_type: 'video', // Use 'video' for audio files
            public_id: `whatsapp_aud_${Date.now()}_${sanitizedFilename}`,
            quality: 'auto'
          };
        }

        // Use stream upload for all file types (recommended by Cloudinary)
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', error);
              console.error('❌ Upload options that failed:', uploadOptions);
              reject(error);
            } else {

              resolve(result);
            }
          }
        );

        uploadStream.end(req.file.buffer);
      });

      // Send media message via WhatsApp API
      response = await whatsappService.sendMediaMessage(
        phoneNumber,
        uploadResult.secure_url,
        messageType,
        message || '',
        req.file.originalname
      );

      if (!response || !response.messages?.[0]?.id) {
        throw new Error('Failed to send WhatsApp media message');
      }

      const messageId = response.messages[0].id;

      // Create message record with media metadata
      whatsAppMessage = new WhatsAppMessage({
        messageId,
        from: process.env.WHATSAPP_PHONE_NUMBER_ID,
        to: phoneNumber,
        message: message || `Sent ${messageType}`,
        messageType,
        timestamp: new Date(),
        direction: 'outgoing',
        conversationId: conversation._id,
        adminUserId: req.user.id,
        status: 'sent',
        repliedTo: replyToMessageId || null,
        metadata: {
          media_url: uploadResult.secure_url,
          mime_type: req.file.mimetype,
          file_size: req.file.size,
          caption: message || '',
          filename: req.file.originalname,
          cloudinary_public_id: uploadResult.public_id
        }
      });
    } else {
      // Send text message only
      response = await whatsappService.sendMessage(phoneNumber, message);

      if (!response || !response.messages?.[0]?.id) {
        throw new Error('Failed to send WhatsApp message');
      }

      const messageId = response.messages[0].id;

      whatsAppMessage = new WhatsAppMessage({
        messageId,
        from: process.env.WHATSAPP_PHONE_NUMBER_ID,
        to: phoneNumber,
        message,
        messageType: 'text',
        timestamp: new Date(),
        direction: 'outgoing',
        conversationId: conversation._id,
        adminUserId: req.user.id,
        status: 'sent',
        repliedTo: replyToMessageId || null
      });
    }

    await whatsAppMessage.save();

    // Update conversation
    conversation.lastMessageId = whatsAppMessage._id;
    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = whatsAppMessage.message.substring(0, 100);
    conversation.totalMessages += 1;

    // Mark as replied if this is a response to an incoming message
    if (conversation.unreadCount > 0) {
      await WhatsAppMessage.updateMany(
        {
          conversationId: conversation._id,
          direction: 'incoming',
          isReplied: false
        },
        { isReplied: true }
      );
    }

    await conversation.save();

    // Emit real-time update
    const io = getIO();
    if (io) {
      io.emit('newWhatsAppMessage', {
        message: await whatsAppMessage.populate('adminUserId', 'name email'),
        conversation
      });
    }

    res.json({
      success: true,
      data: {
        message: whatsAppMessage,
        whatsappResponse: response
      }
    });
  } catch (error) {
    console.error('Error sending reply with attachment:', error);
    res.status(500).json({ message: 'Error sending reply with attachment', error: error.message });
  }
});

// PUT /api/admin/whatsapp/conversations/:id/assign - Assign conversation to admin
router.put('/whatsapp/conversations/:id/assign', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    const conversation = await WhatsAppConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    conversation.assignedToAdmin = adminId || null;
    await conversation.save();

    const updatedConversation = await conversation.populate('assignedToAdmin', 'name email');

    const io = getIO();
    if (io) {
      io.emit('conversationAssigned', {
        conversationId: id,
        assignedTo: updatedConversation.assignedToAdmin
      });
    }

    res.json({
      success: true,
      data: updatedConversation
    });
  } catch (error) {
    console.error('Error assigning conversation:', error);
    res.status(500).json({ message: 'Error assigning conversation', error: error.message });
  }
});

// PUT /api/admin/whatsapp/conversations/:id/vip - Toggle VIP status
router.put('/whatsapp/conversations/:id/vip', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isVip } = req.body;

    const conversation = await WhatsAppConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    conversation.isVip = isVip;
    await conversation.save();

    const io = getIO();
    if (io) {
      io.emit('conversationVipStatusChanged', {
        conversationId: id,
        isVip
      });
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error updating VIP status:', error);
    res.status(500).json({ message: 'Error updating VIP status', error: error.message });
  }
});

// GET /api/admin/whatsapp/stats - Get WhatsApp statistics
router.get('/whatsapp/stats', auth, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalConversations,
      activeConversations,
      unreadConversations,
      vipConversations,
      todayMessages,
      todayIncoming,
      todayOutgoing,
      totalMessages
    ] = await Promise.all([
      WhatsAppConversation.countDocuments({}),
      WhatsAppConversation.countDocuments({ isActive: true }),
      WhatsAppConversation.countDocuments({ unreadCount: { $gt: 0 } }),
      WhatsAppConversation.countDocuments({ isVip: true }),
      WhatsAppMessage.countDocuments({
        timestamp: { $gte: today, $lt: tomorrow }
      }),
      WhatsAppMessage.countDocuments({
        timestamp: { $gte: today, $lt: tomorrow },
        direction: 'incoming'
      }),
      WhatsAppMessage.countDocuments({
        timestamp: { $gte: today, $lt: tomorrow },
        direction: 'outgoing'
      }),
      WhatsAppMessage.countDocuments({})
    ]);

    // Get hourly message stats for today
    const hourlyStats = await WhatsAppMessage.aggregate([
      {
        $match: {
          timestamp: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            direction: '$direction'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.hour': 1 }
      }
    ]);

    // Get response time stats
    const avgResponseTime = await WhatsAppMessage.aggregate([
      {
        $match: {
          direction: 'outgoing',
          timestamp: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $lookup: {
          from: 'whatsappmessages',
          let: { conversationId: '$conversationId', outgoingTime: '$timestamp' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$conversationId'] },
                    { $eq: ['$direction', 'incoming'] },
                    { $lt: ['$timestamp', '$$outgoingTime'] }
                  ]
                }
              }
            },
            { $sort: { timestamp: -1 } },
            { $limit: 1 }
          ],
          as: 'lastIncoming'
        }
      },
      {
        $match: {
          'lastIncoming.0': { $exists: true }
        }
      },
      {
        $project: {
          responseTime: {
            $subtract: ['$timestamp', { $arrayElemAt: ['$lastIncoming.timestamp', 0] }]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalConversations,
          activeConversations,
          unreadConversations,
          vipConversations,
          totalMessages
        },
        today: {
          totalMessages: todayMessages,
          incomingMessages: todayIncoming,
          outgoingMessages: todayOutgoing,
          avgResponseTimeMs: avgResponseTime[0]?.avgResponseTime || 0
        },
        hourlyStats,
        performance: {
          avgResponseTimeMinutes: avgResponseTime[0] ? Math.round(avgResponseTime[0].avgResponseTime / (1000 * 60)) : 0,
          responseRate: todayIncoming > 0 ? Math.round((todayOutgoing / todayIncoming) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching WhatsApp stats:', error);
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
});

// POST /api/admin/whatsapp/templates - Get or create message templates
router.get('/whatsapp/templates', auth, requireAdmin, async (req, res) => {
  try {
    const templates = [
      {
        id: 'welcome',
        name: 'Welcome Message',
        content: {
          en: 'Welcome to Gaith Tours! How can we help you plan your perfect trip to Saudi Arabia?',
          ar: 'مرحباً بكم في جيث تورز! كيف يمكننا مساعدتكم في التخطيط لرحلتكم المثالية إلى المملكة العربية السعودية؟'
        },
        category: 'greeting'
      },
      {
        id: 'booking_confirmation',
        name: 'Booking Confirmation',
        content: {
          en: 'Your booking has been confirmed! Reference number: {{bookingRef}}. We will contact you soon with more details.',
          ar: 'تم تأكيد حجزكم! رقم المرجع: {{bookingRef}}. سنتواصل معكم قريباً لمزيد من التفاصيل.'
        },
        category: 'booking'
      },
      {
        id: 'payment_reminder',
        name: 'Payment Reminder',
        content: {
          en: 'Friendly reminder: Your payment for booking {{bookingRef}} is due. Please complete your payment to secure your reservation.',
          ar: 'تذكير ودود: دفعة حجزكم {{bookingRef}} مستحقة. يرجى إتمام الدفع لتأكيد حجزكم.'
        },
        category: 'payment'
      },
      {
        id: 'trip_start',
        name: 'Trip Starting Soon',
        content: {
          en: 'Your amazing journey starts tomorrow! Make sure you have all required documents. Contact us if you need any assistance.',
          ar: 'رحلتكم الرائعة تبدأ غداً! تأكدوا من حصولكم على جميع المستندات المطلوبة. تواصلوا معنا إذا كنتم بحاجة لأي مساعدة.'
        },
        category: 'travel'
      },
      {
        id: 'feedback_request',
        name: 'Feedback Request',
        content: {
          en: 'Hope you enjoyed your trip with Gaith Tours! We would love to hear about your experience. Please share your feedback.',
          ar: 'نأمل أن تكونوا قد استمتعتم برحلتكم مع جيث تورز! نود سماع تجربتكم. يرجى مشاركة آرائكم.'
        },
        category: 'feedback'
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
});

// PUT /api/admin/whatsapp/conversations/:id/notes - Update conversation notes
router.put('/whatsapp/conversations/:id/notes', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const conversation = await WhatsAppConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    conversation.metadata.notes = notes;
    await conversation.save();

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({ message: 'Error updating notes', error: error.message });
  }
});

// GET /api/admin/whatsapp/search - Search messages
router.get('/whatsapp/search', auth, requireAdmin, async (req, res) => {
  try {
    const { q, phone, dateFrom, dateTo, messageType, direction } = req.query;

    if (!q && !phone) {
      return res.status(400).json({ message: 'Search query or phone number required' });
    }

    const query = {};

    if (q) {
      query.message = { $regex: q, $options: 'i' };
    }

    if (phone) {
      const conversation = await WhatsAppConversation.findOne({ phoneNumber: phone });
      if (conversation) {
        query.conversationId = conversation._id;
      }
    }

    if (dateFrom || dateTo) {
      query.timestamp = {};
      if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
      if (dateTo) query.timestamp.$lte = new Date(dateTo);
    }

    if (messageType) {
      query.messageType = messageType;
    }

    if (direction) {
      query.direction = direction;
    }

    const messages = await WhatsAppMessage
      .find(query)
      .populate('conversationId', 'phoneNumber customerName')
      .populate('adminUserId', 'name email')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ message: 'Error searching messages', error: error.message });
  }
});

// POST /api/admin/whatsapp/upload - Upload media file
router.post('/whatsapp/upload', auth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { path, mimetype } = req.file;    // Upload to Cloudinary
    const cloudinaryResponse = await cloudinary.v2.uploader.upload(path, {
      resource_type: 'auto', // Automatically detect resource type (image, video, etc.)
      folder: 'whatsapp_media', // Cloudinary folder name
      public_id: `whatsapp_${Date.now()}`, // Public ID for the file (underscore instead of slash)
      overwrite: true // Overwrite file with same public_id
    });

    res.json({
      success: true,
      data: cloudinaryResponse
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error uploading file', error: error.message });
  }
});

module.exports = router;
