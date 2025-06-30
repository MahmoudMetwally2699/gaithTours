const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { protect, admin } = require('../middleware/auth');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppConversation = require('../models/WhatsAppConversation');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const whatsappService = require('../utils/whatsappService');
const { getIO } = require('../socket');
const axios = require('axios');

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

// Apply auth middleware to all routes
router.use(protect);
router.use(admin);

// Debug endpoint to check conversations and create test data
router.get('/debug/conversations', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Checking conversations...');

    // Get all conversations
    const conversations = await WhatsAppConversation.find({})
      .populate('userId', 'name email')
      .sort({ lastMessageAt: -1 })
      .limit(10);

    console.log(`📊 Found ${conversations.length} conversations`);

    // Get all messages
    const messages = await WhatsAppMessage.find({})
      .sort({ timestamp: -1 })
      .limit(20);

    console.log(`💬 Found ${messages.length} messages`);

    // If no conversations exist, create a test conversation
    if (conversations.length === 0) {
      console.log('📝 Creating test conversation...');

      const testConversation = new WhatsAppConversation({
        phoneNumber: '+1234567890',
        customerName: 'Test Customer',
        lastMessageAt: new Date(),
        lastMessagePreview: 'Test message',
        unreadCount: 1,
        totalMessages: 1,
        isActive: true
      });

      await testConversation.save();

      const testMessage = new WhatsAppMessage({
        messageId: 'test_' + Date.now(),
        from: '+1234567890',
        to: process.env.WHATSAPP_PHONE_NUMBER_ID || 'test_phone',
        message: 'This is a test message to verify the system is working',
        messageType: 'text',
        direction: 'incoming',
        conversationId: testConversation._id,
        timestamp: new Date()
      });

      await testMessage.save();

      console.log('✅ Test conversation and message created');
    }

    res.json({
      success: true,
      debug: {
        conversationsCount: conversations.length,
        messagesCount: messages.length,
        conversations: conversations,
        recentMessages: messages.slice(0, 5),
        environment: process.env.NODE_ENV,
        mongoUri: process.env.MONGODB_URI ? 'Connected' : 'Not configured'
      }
    });
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// GET /api/admin/whatsapp/conversations - Get all conversations with pagination
router.get('/conversations', async (req, res) => {
  try {
    console.log('🔍 Getting WhatsApp conversations...');

    const {
      page = 1,
      limit = 20,
      search = '',
      filter = 'all',
      sortBy = 'lastMessageTimestamp',
      sortOrder = 'desc'
    } = req.query;

    console.log('📊 Query params:', { page, limit, search, filter, sortBy, sortOrder });

    // Build query
    let query = {};

    // Apply filters
    if (filter === 'unread') {
      query.unreadCount = { $gt: 0 };
    } else if (filter === 'archived') {
      query.isArchived = true;
    } else if (filter === 'vip') {
      query.isVip = true;
    } else if (filter === 'active') {
      query.isArchived = false;
    }

    // Apply search
    if (search) {
      query.$or = [
        { phoneNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { lastMessage: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('🔎 Query filter:', JSON.stringify(query, null, 2));

    // Check total count first
    const totalCount = await WhatsAppConversation.countDocuments({});
    console.log('📈 Total conversations in database:', totalCount);

    const filteredCount = await WhatsAppConversation.countDocuments(query);
    console.log('📈 Conversations matching filter:', filteredCount);    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fix sort field mapping - map frontend field names to database field names
    let dbSortField = sortBy;
    if (sortBy === 'lastMessageTimestamp') {
      dbSortField = 'lastMessageAt';
    }

    const sort = { [dbSortField]: sortOrder === 'desc' ? -1 : 1 };

    // Get conversations
    const conversations = await WhatsAppConversation.find(query)
      .populate('userId', 'name firstName lastName email')
      .populate('assignedToAdmin', 'name firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log('💬 Found conversations:', conversations.length);

    // Map database fields to frontend expected fields
    const mappedConversations = conversations.map(conv => ({
      ...conv,
      lastMessageTimestamp: conv.lastMessageAt, // Map database field to frontend expected field
      lastMessage: conv.lastMessagePreview, // Map preview to lastMessage
      lastMessageDirection: conv.lastMessageDirection || 'incoming' // Add default if not present
    }));

    // Get total count
    const total = await WhatsAppConversation.countDocuments(query);

    // Calculate stats
    const stats = await WhatsAppConversation.aggregate([
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          unreadConversations: {
            $sum: {
              $cond: [{ $gt: ['$unreadCount', 0] }, 1, 0]
            }
          },
          totalUnreadMessages: { $sum: '$unreadCount' },
          vipConversations: {
            $sum: {
              $cond: ['$isVip', 1, 0]
            }
          }
        }
      }
    ]);    res.json({
      conversations: mappedConversations,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total,
        limit: parseInt(limit)
      },
      stats: stats[0] || {
        totalConversations: 0,
        unreadConversations: 0,
        totalUnreadMessages: 0,
        vipConversations: 0
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/admin/whatsapp/messages/:phone - Get messages for specific phone number
router.get('/messages/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Find conversation
    const conversation = await WhatsAppConversation.findOne({ phoneNumber: phone })
      .populate('userId', 'name firstName lastName email phone');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get messages
    const messages = await WhatsAppMessage.find({ conversationId: conversation._id })
      .populate('adminUserId', 'name firstName lastName')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Reverse to show oldest first
    messages.reverse();

    // Get total count
    const total = await WhatsAppMessage.countDocuments({ conversationId: conversation._id });

    // Get customer reservations if linked
    let reservations = [];
    if (conversation.userId) {
      reservations = await Reservation.find({ userId: conversation.userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id checkIn checkOut totalAmount status hotelName')
        .lean();
    }

    res.json({
      conversation,
      messages,
      reservations,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/admin/whatsapp/reply - Send reply message
router.post('/reply', async (req, res) => {
  try {
    const { phone, message, messageType = 'text', metadata = {} } = req.body;
    const adminUserId = req.user.id;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required' });
    }    // Find or create conversation
    const conversation = await WhatsAppConversation.findOrCreate(phone);

    // Send message via WhatsApp API
    const whatsappResponse = await whatsappService.sendMessage(phone, message);

    if (!whatsappResponse || !whatsappResponse.messages || !whatsappResponse.messages[0]) {
      return res.status(500).json({ error: 'Failed to send WhatsApp message' });
    }

    const messageId = whatsappResponse.messages[0].id;

    // Save message to database
    const newMessage = new WhatsAppMessage({
      messageId: messageId,
      from: process.env.WHATSAPP_PHONE_NUMBER_ID,
      to: phone,
      message,
      messageType,
      direction: 'outgoing',
      conversationId: conversation._id,
      adminUserId,
      metadata,
      status: 'sent'
    });

    await newMessage.save();

    // Update conversation
    conversation.lastMessage = message;
    conversation.lastMessageTimestamp = newMessage.timestamp;
    conversation.lastMessageDirection = 'outgoing';
    conversation.totalMessages += 1;
    conversation.lastActivity = new Date();

    // Mark previous messages as replied
    await WhatsAppMessage.updateMany(
      {
        conversationId: conversation._id,
        direction: 'incoming',
        isReplied: false
      },
      { isReplied: true }
    );

    await conversation.save();

    // Populate admin user info
    await newMessage.populate('adminUserId', 'name firstName lastName');    // Emit real-time event
    const io = getIO();
    if (io) {
      try {
        console.log('🔔 Emitting whatsapp_reply_sent event:', {
          messageId: newMessage._id,
          conversationId: conversation._id,
          to: phone
        });

        // Emit new message event (since it's a new message in the conversation)
        io.to('whatsapp-admins').emit('new_whatsapp_message', {
          message: {
            _id: newMessage._id,
            messageId: newMessage.messageId,
            from: newMessage.from,
            to: newMessage.to,
            message: newMessage.message,
            messageType: newMessage.messageType,
            direction: newMessage.direction,
            timestamp: newMessage.timestamp,
            conversationId: newMessage.conversationId,
            adminUserId: newMessage.adminUserId,
            metadata: newMessage.metadata,
            status: newMessage.status
          },
          conversation: {
            _id: conversation._id,
            phoneNumber: conversation.phoneNumber,
            customerName: conversation.customerName,
            lastMessage: message,
            lastMessageTimestamp: newMessage.timestamp,
            lastMessageDirection: 'outgoing',
            unreadCount: conversation.unreadCount,
            userId: conversation.userId
          }
        });

        // Also emit reply sent event for specific handling
        io.to('whatsapp-admins').emit('whatsapp_reply_sent', {
          message: newMessage,
          conversation: conversation
        });

        console.log('✅ Reply socket events emitted successfully');
      } catch (socketError) {
        console.error('❌ Error emitting reply socket events:', socketError);
      }
    } else {
      console.warn('⚠️ Socket.io not available - reply events not emitted');
    }    res.json({
      success: true,
      message: newMessage,
      whatsappMessageId: messageId
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// POST /api/admin/whatsapp/reply-with-attachment - Send reply message with attachment
router.post('/reply-with-attachment', upload.single('attachment'), async (req, res) => {
  try {
    const { phoneNumber, message = '' } = req.body;
    const adminUserId = req.user?.id;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!req.file && !message) {
      return res.status(400).json({ error: 'Either attachment or message is required' });
    }

    // Find or create conversation
    const conversation = await WhatsAppConversation.findOrCreate(phoneNumber);

    let whatsAppMessage;
    let response;

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
        const uploadOptions = {
          resource_type: resourceType,
          folder: 'whatsapp-attachments',
          public_id: `${Date.now()}_${req.file.originalname.split('.')[0]}`,
          use_filename: true,
          unique_filename: false,
        };        // For documents (especially PDFs), ensure proper handling
        if (isDocument) {
          uploadOptions.format = req.file.originalname.split('.').pop(); // Preserve original extension
          uploadOptions.flags = 'attachment'; // Force download behavior

          // For PDFs specifically, ensure proper content type
          if (req.file.mimetype === 'application/pdf') {
            uploadOptions.content_type = 'application/pdf';
            // Ensure the public_id ends with .pdf for proper recognition
            uploadOptions.public_id = `${Date.now()}_${req.file.originalname.replace(/\.[^/.]+$/, '')}.pdf`;
          }
        }

        console.log('📤 Uploading to Cloudinary:', {
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          messageType,
          resourceType,
          uploadOptions
        });

        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('✅ Cloudinary upload success:', {
                public_id: result.public_id,
                secure_url: result.secure_url,
                resource_type: result.resource_type,
                format: result.format
              });
              resolve(result);
            }
          }
        );

        uploadStream.end(req.file.buffer);
      });      // Send media message via WhatsApp API
      let whatsappMediaUrl = uploadResult.secure_url;

      // For PDFs, try different URL approaches for WhatsApp compatibility
      if (messageType === 'document' && req.file.mimetype === 'application/pdf') {        // Try our own server URL first - WhatsApp often has better luck with direct server URLs
        const serverBaseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.SERVER_BASE_URL || 'http://localhost:5000';
        const fallbackUrl = `${serverBaseUrl}/api/admin/whatsapp/serve-file/${encodeURIComponent(uploadResult.public_id)}?filename=${encodeURIComponent(req.file.originalname)}`;

        whatsappMediaUrl = fallbackUrl;

        console.log('📄 PDF URL for WhatsApp:', {
          original: uploadResult.secure_url,
          cloudinary_url: uploadResult.url,
          server_fallback: fallbackUrl,
          filename: req.file.originalname,
          public_id: uploadResult.public_id
        });
      }

      response = await whatsappService.sendMediaMessage(
        phoneNumber,
        whatsappMediaUrl,
        messageType,
        message || '',
        req.file.originalname
      );

      if (!response || !response.messages?.[0]?.id) {
        throw new Error('Failed to send WhatsApp media message');
      }

      const messageId = response.messages[0].id;      // Create message record with media metadata
      whatsAppMessage = new WhatsAppMessage({
        messageId,
        from: process.env.WHATSAPP_PHONE_NUMBER_ID,
        to: phoneNumber,
        message: message || (isDocument && req.file.mimetype === 'application/pdf' ? `📄 ${req.file.originalname}` : `Sent ${messageType}`),
        messageType,
        timestamp: new Date(),
        direction: 'outgoing',
        conversationId: conversation._id,
        adminUserId,
        status: 'sent',
        metadata: {
          media_url: whatsappMediaUrl, // Use the WhatsApp-optimized URL
          original_url: uploadResult.secure_url, // Keep the original for reference
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
        adminUserId,
        status: 'sent'
      });
    }

    await whatsAppMessage.save();

    // Update conversation
    conversation.lastMessage = whatsAppMessage.message;
    conversation.lastMessageTimestamp = whatsAppMessage.timestamp;
    conversation.lastMessageDirection = 'outgoing';
    conversation.totalMessages += 1;
    conversation.lastActivity = new Date();

    // Mark previous messages as replied
    await WhatsAppMessage.updateMany(
      {
        conversationId: conversation._id,
        direction: 'incoming',
        isReplied: false
      },
      { isReplied: true }
    );

    await conversation.save();

    // Populate admin user info
    await whatsAppMessage.populate('adminUserId', 'name firstName lastName');

    // Emit real-time event
    const io = getIO();
    if (io) {
      try {
        console.log('🔔 Emitting whatsapp_reply_sent event for attachment:', {
          messageId: whatsAppMessage._id,
          conversationId: conversation._id,
          to: phoneNumber
        });

        // Emit new message event (since it's a new message in the conversation)
        io.to('whatsapp-admins').emit('new_whatsapp_message', {
          message: {
            _id: whatsAppMessage._id,
            messageId: whatsAppMessage.messageId,
            from: whatsAppMessage.from,
            to: whatsAppMessage.to,
            message: whatsAppMessage.message,
            messageType: whatsAppMessage.messageType,
            direction: whatsAppMessage.direction,
            timestamp: whatsAppMessage.timestamp,
            conversationId: whatsAppMessage.conversationId,
            adminUserId: whatsAppMessage.adminUserId,
            metadata: whatsAppMessage.metadata,
            status: whatsAppMessage.status
          },
          conversation: {
            _id: conversation._id,
            phoneNumber: conversation.phoneNumber,
            customerName: conversation.customerName,
            lastMessage: whatsAppMessage.message,
            lastMessageTimestamp: whatsAppMessage.timestamp,
            lastMessageDirection: 'outgoing',
            unreadCount: conversation.unreadCount,
            userId: conversation.userId
          }
        });

        // Also emit reply sent event for specific handling
        io.to('whatsapp-admins').emit('whatsapp_reply_sent', {
          message: whatsAppMessage,
          conversation: conversation
        });

        console.log('✅ Attachment reply socket events emitted successfully');
      } catch (socketError) {
        console.error('❌ Error emitting attachment reply socket events:', socketError);
      }
    } else {
      console.warn('⚠️ Socket.io not available - attachment reply events not emitted');
    }

    res.json({
      success: true,
      message: whatsAppMessage,
      whatsappMessageId: response.messages[0].id
    });
  } catch (error) {
    console.error('Error sending reply with attachment:', error);
    res.status(500).json({ error: 'Failed to send reply with attachment' });
  }
});

// PUT /api/admin/whatsapp/messages/:id/read - Mark message as read
router.put('/messages/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const message = await WhatsAppMessage.findById(id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only mark incoming messages as read
    if (message.direction === 'incoming' && !message.isRead) {
      message.isRead = true;
      await message.save();

      // Update conversation unread count
      const conversation = await WhatsAppConversation.findById(message.conversationId);
      if (conversation && conversation.unreadCount > 0) {
        conversation.unreadCount -= 1;
        await conversation.save();

        // Emit real-time event
        const io = getIO();
        if (io) {
          io.emit('whatsapp_message_read', {
            messageId: id,
            conversationId: conversation._id,
            newUnreadCount: conversation.unreadCount
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// PUT /api/admin/whatsapp/conversations/:id/read-all - Mark all messages in conversation as read
router.put('/conversations/:id/read-all', async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await WhatsAppConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Mark all unread incoming messages as read
    await WhatsAppMessage.updateMany(
      {
        conversationId: id,
        direction: 'incoming',
        isRead: false
      },
      { isRead: true }
    );

    // Reset unread count
    conversation.unreadCount = 0;
    await conversation.save();

    // Emit real-time event
    const io = getIO();
    if (io) {
      io.emit('whatsapp_conversation_read', {
        conversationId: id
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
});

// GET /api/admin/whatsapp/stats - Get message statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get message stats
    const messageStats = await WhatsAppMessage.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$direction',
          count: { $sum: 1 },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $eq: ['$direction', 'outgoing'] },
                { $subtract: ['$timestamp', '$createdAt'] },
                null
              ]
            }
          }
        }
      }
    ]);

    // Get conversation stats
    const conversationStats = await WhatsAppConversation.aggregate([
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          activeConversations: {
            $sum: {
              $cond: [
                { $gte: ['$lastActivity', startDate] },
                1,
                0
              ]
            }
          },
          unreadConversations: {
            $sum: {
              $cond: [{ $gt: ['$unreadCount', 0] }, 1, 0]
            }
          },
          totalUnreadMessages: { $sum: '$unreadCount' },
          vipConversations: {
            $sum: {
              $cond: ['$isVip', 1, 0]
            }
          }
        }
      }
    ]);

    // Get daily message counts for chart
    const dailyStats = await WhatsAppMessage.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$timestamp'
              }
            },
            direction: '$direction'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    const stats = {
      messages: {
        incoming: messageStats.find(s => s._id === 'incoming')?.count || 0,
        outgoing: messageStats.find(s => s._id === 'outgoing')?.count || 0,
        total: messageStats.reduce((sum, s) => sum + s.count, 0),
        avgResponseTime: messageStats.find(s => s._id === 'outgoing')?.avgResponseTime || 0
      },
      conversations: conversationStats[0] || {
        totalConversations: 0,
        activeConversations: 0,
        unreadConversations: 0,
        totalUnreadMessages: 0,
        vipConversations: 0
      },
      daily: dailyStats
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// PUT /api/admin/whatsapp/conversations/:id/toggle-vip - Toggle VIP status
router.put('/conversations/:id/toggle-vip', async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await WhatsAppConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.isVip = !conversation.isVip;
    await conversation.save();

    res.json({
      success: true,
      isVip: conversation.isVip
    });
  } catch (error) {
    console.error('Error toggling VIP status:', error);
    res.status(500).json({ error: 'Failed to toggle VIP status' });
  }
});

// PUT /api/admin/whatsapp/conversations/:id/archive - Toggle archive status
router.put('/conversations/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await WhatsAppConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.isArchived = !conversation.isArchived;
    await conversation.save();

    res.json({
      success: true,
      isArchived: conversation.isArchived
    });
  } catch (error) {
    console.error('Error toggling archive status:', error);
    res.status(500).json({ error: 'Failed to toggle archive status' });
  }
});

// POST /api/admin/whatsapp/conversations/:id/assign - Assign conversation to admin
router.post('/conversations/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminUserId } = req.body;

    const conversation = await WhatsAppConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (adminUserId) {
      const admin = await User.findById(adminUserId);
      if (!admin || admin.role !== 'admin') {
        return res.status(400).json({ error: 'Invalid admin user' });
      }
    }    conversation.assignedToAdmin = adminUserId || null;
    await conversation.save();

    await conversation.populate('assignedToAdmin', 'name firstName lastName');

    res.json({
      success: true,
      assignedTo: conversation.assignedToAdmin
    });
  } catch (error) {
    console.error('Error assigning conversation:', error);
    res.status(500).json({ error: 'Failed to assign conversation' });
  }
});

// Test endpoint to check webhook configuration
router.get('/webhook-config', async (req, res) => {
  try {
    const config = {
      webhookSecret: !!process.env.WHATSAPP_WEBHOOK_SECRET,
      verifyToken: !!process.env.WHATSAPP_VERIFY_TOKEN,
      accessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      webhookUrl: process.env.API_URL ? `${process.env.API_URL}/webhook/whatsapp` : 'Not configured'
    };

    console.log('📋 WhatsApp Configuration Check:', config);

    res.json({
      success: true,
      config,
      message: 'Webhook configuration status'
    });
  } catch (error) {
    console.error('❌ Error checking webhook config:', error);
    res.status(500).json({ error: 'Failed to check webhook config' });
  }
});

// Test endpoint to create a sample conversation (for debugging)
router.post('/test-conversation', async (req, res) => {
  try {
    console.log('🧪 Creating test conversation...');

    // Check if test conversation already exists
    const existingConversation = await WhatsAppConversation.findOne({
      phoneNumber: '201211477551'
    });

    if (existingConversation) {
      console.log('✅ Test conversation already exists');
      return res.json({
        success: true,
        message: 'Test conversation already exists',
        conversation: existingConversation
      });
    }

    // Create a test conversation
    const testConversation = new WhatsAppConversation({
      phoneNumber: '201211477551',
      customerName: 'Test User',
      lastMessagePreview: 'Hello, this is a test message',
      lastMessageAt: new Date(),
      unreadCount: 1,
      totalMessages: 1,
      isActive: true,
      metadata: {
        customerType: 'new',
        preferredLanguage: 'en'
      }
    });

    await testConversation.save();
    console.log('✅ Test conversation created');

    res.json({
      success: true,
      message: 'Test conversation created successfully',
      conversation: testConversation
    });
  } catch (error) {
    console.error('❌ Error creating test conversation:', error);
    res.status(500).json({ error: 'Failed to create test conversation' });
  }
});

// Test endpoint to create a fake WhatsApp message for testing real-time updates
router.post('/test-message', async (req, res) => {
  try {
    const { phoneNumber = '+1234567890', message = 'Test message' } = req.body;

    // Find or create test conversation
    let conversation = await WhatsAppConversation.findOne({ phoneNumber });
    if (!conversation) {
      conversation = new WhatsAppConversation({
        phoneNumber,
        customerName: 'Test Customer',
        unreadCount: 0,
        totalMessages: 0
      });
      await conversation.save();
    }

    // Create test message
    const whatsAppMessage = new WhatsAppMessage({
      messageId: `test_${Date.now()}`,
      from: phoneNumber,
      to: process.env.WHATSAPP_PHONE_NUMBER_ID || '123456789',
      message,
      messageType: 'text',
      direction: 'incoming',
      conversationId: conversation._id,
      timestamp: new Date()
    });

    await whatsAppMessage.save();

    // Update conversation
    conversation.lastMessageId = whatsAppMessage._id;
    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = message.substring(0, 100);
    conversation.unreadCount += 1;
    conversation.totalMessages += 1;
    await conversation.save();

    // Emit real-time event
    const io = getIO();
    if (io) {
      console.log('🚀 Emitting test new_whatsapp_message event...');
      io.emit('new_whatsapp_message', {
        message: whatsAppMessage,
        conversation: await conversation.populate('userId', 'name email')
      });

      io.emit('whatsapp_conversation_updated', {
        conversationId: conversation._id,
        unreadCount: conversation.unreadCount,
        lastMessage: message,
        lastMessageAt: new Date()
      });

      console.log('✅ Real-time events emitted successfully');
    } else {
      console.error('❌ Socket.IO not available');
    }

    res.json({
      success: true,
      message: 'Test message created and events emitted',
      data: {
        message: whatsAppMessage,
        conversation
      }
    });
  } catch (error) {
    console.error('Error creating test message:', error);
    res.status(500).json({ error: 'Failed to create test message' });
  }
});

// POST /api/admin/whatsapp/test-socket - Test socket events
router.post('/test-socket', async (req, res) => {
  try {
    const { eventType = 'new_whatsapp_message' } = req.body;

    // Create a test message
    const testMessage = {
      _id: 'test_' + Date.now(),
      messageId: 'test_msg_' + Date.now(),
      from: '+1234567890',
      to: process.env.WHATSAPP_PHONE_NUMBER_ID || 'test_phone',
      message: 'This is a test message to verify real-time updates are working correctly at ' + new Date().toISOString(),
      messageType: 'text',
      direction: 'incoming',
      timestamp: new Date(),
      conversationId: 'test_conversation_id',
      metadata: {},
      status: 'received'
    };

    const testConversation = {
      _id: 'test_conversation_id',
      phoneNumber: '+1234567890',
      customerName: 'Test Customer',
      lastMessage: testMessage.message,
      lastMessageTimestamp: testMessage.timestamp,
      lastMessageDirection: 'incoming',
      unreadCount: 1
    };

    // Emit socket event
    const io = getIO();
    if (io) {
      console.log('🧪 Emitting test socket event:', eventType);

      switch (eventType) {
        case 'new_whatsapp_message':
          io.to('whatsapp-admins').emit('new_whatsapp_message', {
            message: testMessage,
            conversation: testConversation
          });
          break;

        case 'whatsapp_reply_sent':
          io.to('whatsapp-admins').emit('whatsapp_reply_sent', {
            message: { ...testMessage, direction: 'outgoing' },
            conversation: { ...testConversation, lastMessageDirection: 'outgoing' }
          });
          break;

        case 'whatsapp_message_status_update':
          io.to('whatsapp-admins').emit('whatsapp_message_status_update', {
            messageId: testMessage.messageId,
            status: 'delivered',
            timestamp: Date.now()
          });
          break;

        default:
          return res.status(400).json({ error: 'Invalid event type' });
      }

      console.log('✅ Test socket event emitted successfully');
      res.json({
        success: true,
        message: 'Test event emitted successfully',
        eventType,
        testData: { message: testMessage, conversation: testConversation }
      });
    } else {
      console.error('❌ Socket.io not available');
      res.status(500).json({ error: 'Socket.io not available' });
    }
  } catch (error) {
    console.error('❌ Error emitting test socket event:', error);
    res.status(500).json({ error: 'Failed to emit test event', details: error.message });
  }
});

// GET /api/admin/whatsapp/recent-updates - Get recent updates for polling fallback
router.get('/recent-updates', async (req, res) => {
  try {
    console.log('🔄 Polling for recent updates...');

    const { since, limit = 20 } = req.query;
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 5 * 60 * 1000); // Default: last 5 minutes

    // Get recent messages
    const recentMessages = await WhatsAppMessage.find({
      timestamp: { $gte: sinceDate }
    })
    .populate('conversationId', 'phoneNumber customerName unreadCount')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit));

    // Get updated conversations
    const recentConversations = await WhatsAppConversation.find({
      lastMessageAt: { $gte: sinceDate }
    })
    .populate('userId', 'name email')
    .sort({ lastMessageAt: -1 })
    .limit(parseInt(limit));

    const updates = [];

    // Add new messages as updates
    for (const message of recentMessages) {
      updates.push({
        type: 'new_message',
        timestamp: message.timestamp,
        data: {
          message: {
            _id: message._id,
            messageId: message.messageId,
            from: message.from,
            to: message.to,
            message: message.message,
            messageType: message.messageType,
            direction: message.direction,
            timestamp: message.timestamp,
            conversationId: message.conversationId._id,
            metadata: message.metadata,
            status: message.status
          },
          conversation: {
            _id: message.conversationId._id,
            phoneNumber: message.conversationId.phoneNumber,
            customerName: message.conversationId.customerName,
            unreadCount: message.conversationId.unreadCount
          }
        }
      });
    }

    // Add conversation updates
    for (const conversation of recentConversations) {
      // Avoid duplicates if we already have a message from this conversation
      const hasMessageUpdate = updates.some(update =>
        update.type === 'new_message' &&
        update.data.conversation._id.toString() === conversation._id.toString()
      );

      if (!hasMessageUpdate) {
        updates.push({
          type: 'conversation_update',
          timestamp: conversation.lastMessageAt,
          data: {
            conversation: {
              _id: conversation._id,
              phoneNumber: conversation.phoneNumber,
              customerName: conversation.customerName,
              lastMessage: conversation.lastMessagePreview,
              lastMessageTimestamp: conversation.lastMessageAt,
              unreadCount: conversation.unreadCount,
              userId: conversation.userId
            }
          }
        });
      }
    }

    // Sort by timestamp
    updates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log(`📊 Found ${updates.length} updates since ${sinceDate.toISOString()}`);

    res.json({
      success: true,
      updates,
      since: sinceDate.toISOString(),
      pollingTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error getting recent updates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent updates',
      details: error.message
    });
  }
});

// GET /api/admin/whatsapp/serve-file/:publicId - Serve file for WhatsApp
router.get('/serve-file/:publicId(*)', async (req, res) => {
  try {
    const publicId = req.params.publicId;
    const filename = req.query.filename || 'document';

    console.log('📥 Serving file for WhatsApp:', { publicId, filename });

    // Get the file URL from Cloudinary
    const fileUrl = cloudinary.url(publicId, {
      resource_type: 'raw',
      secure: false // Use HTTP for better WhatsApp compatibility
    });

    // Fetch the file from Cloudinary using axios
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'application/octet-stream';

    // Set proper headers for WhatsApp
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*'
    });

    res.send(buffer);

    console.log('✅ File served successfully:', {
      publicId,
      filename,
      contentType,
      size: buffer.length
    });

  } catch (error) {
    console.error('❌ Error serving file:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

module.exports = router;
