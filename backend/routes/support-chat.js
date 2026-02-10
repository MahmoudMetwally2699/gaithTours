const express = require('express');
const { protect, admin } = require('../middleware/auth');
const SupportChat = require('../models/SupportChat');
const SupportChatMessage = require('../models/SupportChatMessage');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendPushNotification, sendPushToAdmins, sendPushToGuest } = require('../utils/pushService');

const router = express.Router();

// Helper to get socket emitters (lazy-loaded to avoid circular deps)
let socketHelpers = null;
const getSocketHelpers = () => {
  if (!socketHelpers) {
    try {
      socketHelpers = require('../socket');
    } catch (e) {
      console.error('Socket not available for support chat:', e.message);
    }
  }
  return socketHelpers;
};

/**
 * Optional auth middleware: tries to authenticate but allows guest access.
 * Sets req.user if authenticated, otherwise sets req.guestId from header.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
        return next();
      }
    }
  } catch (err) {
    // Token invalid — fall through to guest
  }

  // Guest mode: require guestId header
  const guestId = req.headers['x-guest-id'];
  if (guestId) {
    req.guestId = guestId;
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication or guest ID required'
  });
};

/**
 * Build ownership query: match by userId OR guestId
 */
const ownerQuery = (req) => {
  if (req.user) return { userId: req.user._id };
  return { guestId: req.guestId };
};

// ==========================================
// USER / GUEST ENDPOINTS
// ==========================================

/**
 * POST /api/support-chat
 * Start a new support chat conversation (authenticated or guest)
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { subject, topic, message, guestName } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    // Create chat
    const chatData = {
      subject,
      topic: topic || 'general',
      lastMessagePreview: message.substring(0, 100),
      lastMessageAt: new Date(),
      unreadByAdmin: 1,
      unreadByUser: 0
    };

    if (req.user) {
      chatData.userId = req.user._id;
    } else {
      chatData.guestId = req.guestId;
      chatData.guestName = guestName || 'Guest';
    }

    const chat = new SupportChat(chatData);
    await chat.save();

    // Create first message
    const msgData = {
      chatId: chat._id,
      sender: 'user',
      message
    };
    if (req.user) {
      msgData.senderUserId = req.user._id;
    }

    const chatMessage = new SupportChatMessage(msgData);
    await chatMessage.save();

    // Populate user info for the response (if authenticated)
    if (req.user) {
      await chat.populate('userId', 'name email');
    }

    // Notify admins via socket
    const io = getSocketHelpers();
    if (io) {
      io.emitToSupportAdmins('new_support_chat', {
        chat,
        message: chatMessage
      });
    }

    // Push notification to admins
    const senderName = req.user ? req.user.name : (req.body.guestName || 'Guest');
    sendPushToAdmins({
      title: '💬 New Support Chat',
      body: `${senderName}: ${subject}`,
      tag: `support-new-${chat._id}`,
      url: '/admin/support',
      data: { chatId: chat._id.toString() }
    }).catch(err => console.error('Push to admins failed:', err));

    res.status(201).json({
      success: true,
      data: { chat, message: chatMessage }
    });
  } catch (error) {
    console.error('Error creating support chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support chat'
    });
  }
});

/**
 * GET /api/support-chat
 * Get user's/guest's chats
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const chats = await SupportChat.find(ownerQuery(req))
      .populate('assignedAdmin', 'name')
      .sort({ lastMessageAt: -1 });

    res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    console.error('Error fetching support chats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support chats'
    });
  }
});

/**
 * GET /api/support-chat/:id/messages
 * Get messages for a chat (user/guest must own the chat)
 */
router.get('/:id/messages', optionalAuth, async (req, res) => {
  try {
    const chat = await SupportChat.findOne({
      _id: req.params.id,
      ...ownerQuery(req)
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const messages = await SupportChatMessage.find({ chatId: chat._id })
      .populate('senderUserId', 'name')
      .sort({ createdAt: 1 });

    // Mark admin messages as read
    await SupportChatMessage.updateMany(
      { chatId: chat._id, sender: 'admin', isRead: false },
      { isRead: true }
    );
    chat.unreadByUser = 0;
    await chat.save();

    res.json({
      success: true,
      data: { messages, chat }
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

/**
 * POST /api/support-chat/:id/messages
 * Send a message in a chat (user/guest must own the chat)
 */
router.post('/:id/messages', optionalAuth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const chat = await SupportChat.findOne({
      _id: req.params.id,
      ...ownerQuery(req)
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (chat.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'This chat has been closed'
      });
    }

    const msgData = {
      chatId: chat._id,
      sender: 'user',
      message
    };
    if (req.user) {
      msgData.senderUserId = req.user._id;
    }

    const chatMessage = new SupportChatMessage(msgData);
    await chatMessage.save();

    // Update chat metadata
    chat.lastMessageAt = new Date();
    chat.lastMessagePreview = message.substring(0, 100);
    chat.unreadByAdmin += 1;
    await chat.save();

    // Notify via socket
    const io = getSocketHelpers();
    if (io) {
      io.emitToSupportAdmins('new_support_message', {
        chatId: chat._id,
        message: chatMessage
      });
    }

    // Push notification to admins
    const senderName = req.user ? req.user.name : 'Guest';
    sendPushToAdmins({
      title: '💬 New Message',
      body: `${senderName}: ${message.substring(0, 100)}`,
      tag: `support-msg-${chat._id}`,
      url: '/admin/support',
      data: { chatId: chat._id.toString() }
    }).catch(err => console.error('Push to admins failed:', err));

    res.status(201).json({
      success: true,
      data: chatMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

/**
 * PATCH /api/support-chat/:id/close
 * Close a chat (user/guest)
 */
router.patch('/:id/close', optionalAuth, async (req, res) => {
  try {
    const chat = await SupportChat.findOne({
      _id: req.params.id,
      ...ownerQuery(req)
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    chat.status = 'closed';
    await chat.save();

    // Notify admins
    const io = getSocketHelpers();
    if (io) {
      io.emitToSupportAdmins('support_chat_closed', {
        chatId: chat._id
      });
    }

    res.json({
      success: true,
      message: 'Chat closed'
    });
  } catch (error) {
    console.error('Error closing chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close chat'
    });
  }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

/**
 * GET /api/support-chat/admin/list
 * List all support chats for admins with filters
 */
router.get('/admin/list', protect, admin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const chats = await SupportChat.find(query)
      .populate('userId', 'name email phone')
      .populate('assignedAdmin', 'name email')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SupportChat.countDocuments(query);

    res.json({
      success: true,
      data: {
        chats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin support chats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support chats'
    });
  }
});

/**
 * GET /api/support-chat/admin/:id/messages
 * Admin get messages for a chat
 */
router.get('/admin/:id/messages', protect, admin, async (req, res) => {
  try {
    const chat = await SupportChat.findById(req.params.id)
      .populate('userId', 'name email phone');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const messages = await SupportChatMessage.find({ chatId: chat._id })
      .populate('senderUserId', 'name')
      .sort({ createdAt: 1 });

    // Mark user messages as read
    await SupportChatMessage.updateMany(
      { chatId: chat._id, sender: 'user', isRead: false },
      { isRead: true }
    );
    chat.unreadByAdmin = 0;
    await chat.save();

    res.json({
      success: true,
      data: { messages, chat }
    });
  } catch (error) {
    console.error('Error fetching admin chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

/**
 * POST /api/support-chat/admin/:id/messages
 * Admin send reply
 */
router.post('/admin/:id/messages', protect, admin, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const chat = await SupportChat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const chatMessage = new SupportChatMessage({
      chatId: chat._id,
      sender: 'admin',
      senderUserId: req.user._id,
      message
    });
    await chatMessage.save();

    // Update chat metadata
    chat.lastMessageAt = new Date();
    chat.lastMessagePreview = message.substring(0, 100);
    chat.unreadByUser += 1;
    if (chat.status === 'open') {
      chat.status = 'assigned';
      chat.assignedAdmin = req.user._id;
    }
    await chat.save();

    // Populate sender info
    await chatMessage.populate('senderUserId', 'name');

    // Notify user or guest via socket
    const io = getSocketHelpers();
    if (io) {
      const targetRoom = chat.userId
        ? `support-user-${chat.userId.toString()}`
        : `support-guest-${chat.guestId}`;
      io.emitToSupportUser(targetRoom, 'new_support_message', {
        chatId: chat._id,
        message: chatMessage
      });
    }

    // Push notification to user or guest
    console.log(`🔔 Admin reply push: chat.userId=${chat.userId}, chat.guestId=${chat.guestId}`);
    if (chat.userId) {
      sendPushNotification(chat.userId.toString(), {
        title: '💬 Support Reply',
        body: `${req.user.name}: ${message.substring(0, 100)}`,
        tag: `support-reply-${chat._id}`,
        url: '/',
        data: { chatId: chat._id.toString() }
      }).catch(err => console.error('Push to user failed:', err));
    } else if (chat.guestId) {
      sendPushToGuest(chat.guestId, {
        title: '💬 Support Reply',
        body: `${req.user.name}: ${message.substring(0, 100)}`,
        tag: `support-reply-${chat._id}`,
        url: '/',
        data: { chatId: chat._id.toString() }
      }).catch(err => console.error('Push to guest failed:', err));
    }

    res.status(201).json({
      success: true,
      data: chatMessage
    });
  } catch (error) {
    console.error('Error sending admin reply:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply'
    });
  }
});

/**
 * PATCH /api/support-chat/admin/:id/assign
 * Assign chat to current admin
 */
router.patch('/admin/:id/assign', protect, admin, async (req, res) => {
  try {
    const chat = await SupportChat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    chat.assignedAdmin = req.user._id;
    chat.status = 'assigned';
    await chat.save();

    await chat.populate('assignedAdmin', 'name email');

    res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Error assigning chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign chat'
    });
  }
});

/**
 * PATCH /api/support-chat/admin/:id/resolve
 * Mark chat as resolved
 */
router.patch('/admin/:id/resolve', protect, admin, async (req, res) => {
  try {
    const chat = await SupportChat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    chat.status = 'resolved';
    await chat.save();

    // Notify user or guest
    const io = getSocketHelpers();
    if (io) {
      const targetRoom = chat.userId
        ? `support-user-${chat.userId.toString()}`
        : `support-guest-${chat.guestId}`;
      io.emitToSupportUser(targetRoom, 'support_chat_resolved', {
        chatId: chat._id
      });
    }

    res.json({
      success: true,
      message: 'Chat resolved'
    });
  } catch (error) {
    console.error('Error resolving chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve chat'
    });
  }
});

module.exports = router;
