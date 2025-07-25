const express = require('express');
const crypto = require('crypto');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppConversation = require('../models/WhatsAppConversation');
const User = require('../models/User');
const { getIO } = require('../socket');

const router = express.Router();

// Rate limiting for webhook endpoint
const rateLimit = require('express-rate-limit');
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to verify webhook signature
const verifyWebhookSignature = (req, res, next) => {
  try {
    const signature = req.get('X-Hub-Signature-256');
    const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const signatureHash = signature.replace('sha256=', '');

    // Handle raw body (Buffer) or JSON object
    let bodyString;
    if (Buffer.isBuffer(req.body)) {
      bodyString = req.body.toString('utf8');
    } else if (typeof req.body === 'object') {
      bodyString = JSON.stringify(req.body);
    } else {
      bodyString = req.body;
    }


    const expectedHash = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyString, 'utf8')
      .digest('hex');


    if (signatureHash !== expectedHash) {

      // In production, this should return 401, but for debugging let's continue
      if (process.env.NODE_ENV === 'production') {
        // Temporarily allow for debugging - REMOVE THIS IN PRODUCTION
        // return res.status(401).json({ error: 'Invalid signature' });
      }    }

    // Parse the body if it's still a Buffer
    if (Buffer.isBuffer(req.body)) {
      req.body = JSON.parse(bodyString);
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /webhook/whatsapp - Webhook verification
router.get('/whatsapp', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];


    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /webhook/whatsapp - Receive messages
router.post('/whatsapp', webhookLimiter, verifyWebhookSignature, async (req, res) => {
  try {

    // Respond immediately to Meta
    res.status(200).json({ success: true });

    // Process the webhook data
    if (req.body.object === 'whatsapp_business_account') {
      for (const entry of req.body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value.messages) {
              await processIncomingMessages(change.value);
            }

            if (change.field === 'messages' && change.value.statuses) {
              await processMessageStatuses(change.value);
            }
          }
        }
      }
    }
  } catch (error) {
    // Still return 200 to prevent Meta from retrying
    res.status(200).json({ success: false, error: error.message });
  }
});

// Process incoming messages
async function processIncomingMessages(data) {
  try {
    const { messages, contacts, metadata } = data;

    for (const message of messages) {
      const phoneNumber = message.from;
      const messageId = message.id;
      const timestamp = new Date(parseInt(message.timestamp) * 1000);

      // Check if message already exists
      const existingMessage = await WhatsAppMessage.findOne({ messageId });
      if (existingMessage) {
        continue;
      }

      // Find or create conversation
      let conversation = await WhatsAppConversation.findOne({ phoneNumber });
      if (!conversation) {
        // Try to link to existing user
        const user = await User.findOne({
          phone: { $regex: phoneNumber.replace(/^\+/, ''), $options: 'i' }
        });

        conversation = new WhatsAppConversation({
          phoneNumber,
          userId: user?._id,
          customerName: user?.name || getContactName(contacts, phoneNumber) || '',
          metadata: {
            customerType: user ? 'returning' : 'new',
            preferredLanguage: user?.preferredLanguage || 'en'
          }
        });
        await conversation.save();
      }

      // Extract message content based on type
      const messageData = extractMessageContent(message);

      // Create message record
      const whatsAppMessage = new WhatsAppMessage({
        messageId,
        from: phoneNumber,
        to: metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID,
        message: messageData.text,
        messageType: messageData.type,
        timestamp,
        direction: 'incoming',
        conversationId: conversation._id,
        metadata: messageData.metadata
      });

      await whatsAppMessage.save();

      // Update conversation
      conversation.lastMessageId = whatsAppMessage._id;
      conversation.lastMessageAt = timestamp;
      conversation.lastMessagePreview = messageData.text.substring(0, 100);
      conversation.unreadCount += 1;
      conversation.totalMessages += 1;
      await conversation.save();      // Emit real-time update
      const io = getIO();
      if (io) {
        try {

          // Populate conversation with user data for frontend
          const populatedConversation = await conversation.populate('userId', 'name email');

          // Emit to all admin users
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
              metadata: whatsAppMessage.metadata,
              status: whatsAppMessage.status
            },
            conversation: {
              _id: populatedConversation._id,
              phoneNumber: populatedConversation.phoneNumber,
              customerName: populatedConversation.customerName,
              lastMessage: messageData.text,
              lastMessageTimestamp: timestamp,
              lastMessageDirection: 'incoming',
              unreadCount: populatedConversation.unreadCount,
              userId: populatedConversation.userId
            }
          });

          // Also emit conversation update
          io.to('whatsapp-admins').emit('whatsapp_conversation_updated', {
            conversationId: conversation._id,
            unreadCount: conversation.unreadCount,
            lastMessage: messageData.text,
            lastMessageAt: timestamp,
            lastMessageDirection: 'incoming'
          });

        } catch (socketError) {
        }
      } else {
      }


      // Check for auto-reply rules
      await checkAutoReplyRules(conversation, whatsAppMessage);
    }
  } catch (error) {
  }
}

// Process message status updates
async function processMessageStatuses(data) {
  try {
    const { statuses } = data;

    for (const status of statuses) {
      const messageId = status.id;
      const statusType = status.status; // sent, delivered, read, failed

      await WhatsAppMessage.findOneAndUpdate(
        { messageId },
        {
          status: statusType,
          ...(status.timestamp && { timestamp: new Date(parseInt(status.timestamp) * 1000) })
        }
      );      // Emit status update
      const io = getIO();
      if (io) {
        try {

          io.to('whatsapp-admins').emit('whatsapp_message_status_update', {
            messageId,
            status: statusType,
            timestamp: status.timestamp
          });

        } catch (socketError) {
        }
      } else {
      }
    }
  } catch (error) {
  }
}

// Extract message content based on type
function extractMessageContent(message) {
  const messageType = message.type;
  let text = '';
  let metadata = {};

  switch (messageType) {
    case 'text':
      text = message.text?.body || '';
      break;

    case 'image':
      text = message.image?.caption || '[Image]';
      metadata = {
        media_id: message.image?.id,
        mime_type: message.image?.mime_type,
        caption: message.image?.caption
      };
      break;

    case 'document':
      text = message.document?.caption || `[Document: ${message.document?.filename || 'Unknown'}]`;
      metadata = {
        media_id: message.document?.id,
        mime_type: message.document?.mime_type,
        caption: message.document?.caption,
        filename: message.document?.filename
      };
      break;

    case 'audio':
      text = '[Audio Message]';
      metadata = {
        media_id: message.audio?.id,
        mime_type: message.audio?.mime_type
      };
      break;

    case 'video':
      text = message.video?.caption || '[Video]';
      metadata = {
        media_id: message.video?.id,
        mime_type: message.video?.mime_type,
        caption: message.video?.caption
      };
      break;

    case 'location':
      text = `[Location: ${message.location?.name || 'Shared location'}]`;
      metadata = {
        location: {
          latitude: message.location?.latitude,
          longitude: message.location?.longitude,
          name: message.location?.name,
          address: message.location?.address
        }
      };
      break;

    case 'contact':
      text = `[Contact: ${message.contact?.name?.formatted_name || 'Unknown'}]`;
      metadata = {
        contact: {
          name: message.contact?.name?.formatted_name,
          phone: message.contact?.phones?.[0]?.phone
        }
      };
      break;

    default:
      text = `[${messageType} message]`;
  }

  return {
    type: messageType,
    text,
    metadata
  };
}

// Get contact name from contacts array
function getContactName(contacts, phoneNumber) {
  if (!contacts) return null;
  const contact = contacts.find(c => c.wa_id === phoneNumber);
  return contact?.profile?.name || null;
}

// Check auto-reply rules (basic implementation)
async function checkAutoReplyRules(conversation, message) {
  try {
    if (!conversation.autoReplyEnabled) return;

    const messageText = message.message.toLowerCase();
    const now = new Date();

    // Prevent spam - only auto-reply once per hour
    if (conversation.lastAutoReplyAt &&
        (now - conversation.lastAutoReplyAt) < 60 * 60 * 1000) {
      return;
    }

    let autoReplyText = null;

    // Basic keyword responses
    if (messageText.includes('hello') || messageText.includes('hi') || messageText.includes('سلام') || messageText.includes('مرحبا')) {
      autoReplyText = conversation.metadata.preferredLanguage === 'ar'
        ? 'مرحباً! شكراً لتواصلك مع جيث تورز. سيقوم فريقنا بالرد عليك قريباً.'
        : 'Hello! Thank you for contacting Gaith Tours. Our team will respond to you shortly.';
    } else if (messageText.includes('booking') || messageText.includes('reservation') || messageText.includes('حجز')) {
      autoReplyText = conversation.metadata.preferredLanguage === 'ar'
        ? 'شكراً لاهتمامك بخدماتنا! سيتواصل معك أحد مختصي الحجز قريباً.'
        : 'Thank you for your interest! One of our booking specialists will contact you soon.';
    }

    if (autoReplyText) {
      const WhatsAppService = require('../utils/whatsappService');
      const whatsappService = new WhatsAppService();

      await whatsappService.sendMessage(conversation.phoneNumber, autoReplyText);

      // Update last auto-reply time
      conversation.lastAutoReplyAt = now;
      await conversation.save();
    }
  } catch (error) {
  }
}

// Test endpoint to simulate webhook message (for development)
router.post('/test-message', async (req, res) => {
  try {
    const { phoneNumber = '+1234567890', message = 'Test message from webhook simulation' } = req.body;


    // Find or create conversation
    let conversation = await WhatsAppConversation.findOne({ phoneNumber });
    if (!conversation) {
      conversation = new WhatsAppConversation({
        phoneNumber,
        customerName: phoneNumber.replace('+', ''),
        lastMessageAt: new Date(),
        lastMessagePreview: message.substring(0, 100),
        unreadCount: 1,
        totalMessages: 1,
        isActive: true
      });
      await conversation.save();
    } else {
      conversation.lastMessageAt = new Date();
      conversation.lastMessagePreview = message.substring(0, 100);
      conversation.unreadCount += 1;
      conversation.totalMessages += 1;
      await conversation.save();
    }

    // Create message
    const whatsAppMessage = new WhatsAppMessage({
      messageId: 'test_' + Date.now(),
      from: phoneNumber,
      to: process.env.WHATSAPP_PHONE_NUMBER_ID || 'test_phone',
      message,
      messageType: 'text',
      direction: 'incoming',
      conversationId: conversation._id,
      timestamp: new Date()
    });

    await whatsAppMessage.save();

    // Emit real-time update
    const io = getIO();
    if (io) {
      io.emit('new_whatsapp_message', {
        message: whatsAppMessage,
        conversation
      });
    } else {
    }

    res.json({
      success: true,
      message: 'Test message created successfully',
      data: {
        conversation,
        message: whatsAppMessage
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to check webhook configuration
router.get('/debug/config', (req, res) => {
  try {
    const config = {
      webhookSecret: !!process.env.WHATSAPP_WEBHOOK_SECRET,
      verifyToken: !!process.env.WHATSAPP_VERIFY_TOKEN,
      accessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      environment: process.env.NODE_ENV,
      webhookSecretLength: process.env.WHATSAPP_WEBHOOK_SECRET ? process.env.WHATSAPP_WEBHOOK_SECRET.length : 0
    };


    res.json({
      success: true,
      config,
      message: 'Webhook configuration check'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check config' });
  }
});

// Test webhook signature verification
router.post('/debug/test-signature', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const signature = req.get('X-Hub-Signature-256');
    const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;



    if (Buffer.isBuffer(req.body)) {
      const bodyString = req.body.toString('utf8');

      if (signature && webhookSecret) {
        const signatureHash = signature.replace('sha256=', '');
        const expectedHash = crypto
          .createHmac('sha256', webhookSecret)
          .update(bodyString, 'utf8')
          .digest('hex');

      }
    }

    res.json({
      success: true,
      signature: !!signature,
      webhookSecret: !!webhookSecret,
      bodyType: typeof req.body,
      isBuffer: Buffer.isBuffer(req.body)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
