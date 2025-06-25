const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://gaithtours.vercel.app',
        'https://gaith-tours.vercel.app',
        'https://gaith-tours-six.vercel.app',
        process.env.FRONTEND_URL
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    // Additional configuration for better performance
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      if (user.role !== 'admin' && user.role !== 'superadmin') {
        return next(new Error('Admin access required'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
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
