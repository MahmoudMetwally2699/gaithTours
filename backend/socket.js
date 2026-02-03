const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;

const initializeSocket = (server) => {
  console.log('🔄 Initializing Socket.IO server...');

  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://gaithtours.vercel.app',
        'https://gaith-tours.vercel.app',
        'https://gaith-tours-six.vercel.app',
        'https://gaith-tours-one.vercel.app',
        'https://gaith-tours-backend.vercel.app',
        'https://gaith-tours-backend-virid.vercel.app',
        'https://gaithtours.com',
        'https://api.gaithtours.com',
        process.env.FRONTEND_URL,
        process.env.BACKEND_URL
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    // Configuration optimized for serverless/Vercel
    transports: ['polling'], // Only use polling for serverless
    pingTimeout: 60000, // Longer timeout for serverless
    pingInterval: 25000, // Longer interval for serverless
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6,
    allowEIO3: true,
    httpCompression: false, // Disable compression for better serverless performance
    perMessageDeflate: false,
    serveClient: false, // Don't serve client files
    cookie: false, // Disable cookies for serverless
    // Additional serverless optimizations
    allowRequest: (req, callback) => {
      // Allow all requests for now
      console.log('🔌 Socket.IO connection request from:', req.headers.origin || 'unknown origin');
      callback(null, true);
    },
    // Connection state recovery for better serverless experience
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    }
  });
  console.log('✅ Socket.IO server initialized successfully');

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        console.error('❌ No authentication token provided');
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select('-password');      if (!user) {
        console.error('❌ User not found for ID:', decoded.id);
        return next(new Error('User not found'));
      }

      if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'super_admin') {
        console.error('❌ User does not have admin access:', user.role);
        return next(new Error('Admin access required'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();    } catch (error) {
      console.error('❌ Socket authentication error:', error.message);
      next(new Error('Authentication failed: ' + error.message));
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 New Socket.IO connection:', socket.id, 'User:', socket.user?.name || 'Unknown');

    // Join admin room for WhatsApp notifications
    socket.join('whatsapp-admins');
    console.log('👥 User joined whatsapp-admins room:', socket.user?.name);

    // Handle joining specific conversation rooms
    socket.on('joinConversation', (conversationId) => {
      console.log('🏠 User joining conversation:', conversationId);
      socket.join(`conversation-${conversationId}`);
    });

    // Handle leaving conversation rooms
    socket.on('leaveConversation', (conversationId) => {
      console.log('🚪 User leaving conversation:', conversationId);
      socket.leave(`conversation-${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      socket.to(`conversation-${data.conversationId}`).emit('userTyping', {
        userId: socket.userId,
        userName: socket.user.name,
        conversationId: data.conversationId,
        isTyping: data.isTyping
      });
    });    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnection:', socket.id, 'Reason:', reason);

      // Notify other admins
      socket.broadcast.to('whatsapp-admins').emit('adminDisconnected', {
        userId: socket.userId,
        userName: socket.user.name
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('🔌 Socket.IO error:', error);
    });

    // Handle message read status
    socket.on('markAsRead', async (data) => {
      try {
        const { messageIds, conversationId } = data;

        // Emit to other admins in the same conversation
        socket.to(`conversation-${conversationId}`).emit('messagesMarkedAsRead', {
          messageIds,
          conversationId,
          readBy: {
            id: socket.userId,
            name: socket.user.name
          }
        });
      } catch (error) {
        console.error('Error handling markAsRead:', error);
      }
    });    // Handle admin status updates
    socket.on('updateStatus', (status) => {
      socket.broadcast.to('whatsapp-admins').emit('adminStatusUpdate', {
        userId: socket.userId,
        userName: socket.user.name,
        status
      });
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Helper functions to emit specific events
const emitToAdmins = (event, data) => {
  if (io) {
    io.to('whatsapp-admins').emit(event, data);
  }
};

const emitToConversation = (conversationId, event, data) => {
  if (io) {
    io.to(`conversation-${conversationId}`).emit(event, data);
  }
};

const emitToUser = (userId, event, data) => {
  if (io) {
    const userSockets = Array.from(io.sockets.sockets.values())
      .filter(socket => socket.userId === userId);

    userSockets.forEach(socket => {
      socket.emit(event, data);
    });
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitToAdmins,
  emitToConversation,
  emitToUser
};
