const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;

const initializeSocket = (server) => {  io = new Server(server, {
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
        process.env.FRONTEND_URL,
        process.env.BACKEND_URL
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    // Configuration optimized for serverless/Vercel
    transports: ['polling', 'websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    // Serverless optimizations
    allowEIO3: true,
    maxHttpBufferSize: 1e6,
    httpCompression: true,
    perMessageDeflate: false
  });
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      console.log('🔐 Socket authentication attempt from:', socket.handshake.address);
      console.log('🔐 Auth data:', socket.handshake.auth);
      console.log('🔐 Headers:', socket.handshake.headers);

      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        console.error('❌ No authentication token provided');
        return next(new Error('Authentication token required'));
      }

      console.log('🔐 Token received (first 20 chars):', token.substring(0, 20) + '...');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔐 Token decoded successfully for user ID:', decoded.id);

      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        console.error('❌ User not found for ID:', decoded.id);
        return next(new Error('User not found'));
      }

      console.log('🔐 User found:', user.name, 'Role:', user.role);

      if (user.role !== 'admin' && user.role !== 'superadmin') {
        console.error('❌ User does not have admin access:', user.role);
        return next(new Error('Admin access required'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      console.log('✅ Socket authentication successful for:', user.name);
      next();
    } catch (error) {
      console.error('❌ Socket authentication error:', error.message);
      next(new Error('Authentication failed: ' + error.message));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Admin user connected: ${socket.user.name} (${socket.userId})`);

    // Join admin room for WhatsApp notifications
    socket.join('whatsapp-admins');

    // Handle joining specific conversation rooms
    socket.on('joinConversation', (conversationId) => {
      socket.join(`conversation-${conversationId}`);
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    });

    // Handle leaving conversation rooms
    socket.on('leaveConversation', (conversationId) => {
      socket.leave(`conversation-${conversationId}`);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      socket.to(`conversation-${data.conversationId}`).emit('userTyping', {
        userId: socket.userId,
        userName: socket.user.name,
        conversationId: data.conversationId,
        isTyping: data.isTyping
      });
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
    });

    // Handle admin status updates
    socket.on('updateStatus', (status) => {
      socket.broadcast.to('whatsapp-admins').emit('adminStatusUpdate', {
        userId: socket.userId,
        userName: socket.user.name,
        status
      });
    });

    socket.on('disconnect', () => {
      console.log(`Admin user disconnected: ${socket.user.name} (${socket.userId})`);

      // Notify other admins
      socket.broadcast.to('whatsapp-admins').emit('adminDisconnected', {
        userId: socket.userId,
        userName: socket.user.name
      });
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
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
