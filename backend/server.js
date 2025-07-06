const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { initializeSocket } = require('./socket');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Trust proxy - required for Vercel and other reverse proxies
// Security middleware
app.use(helmet());
app.set('trust proxy', 1);


// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://gaithtours.vercel.app',
  'https://gaith-tours-one.vercel.app',
  'https://gaith-tours-one.vercel.app/',
  'https://gaith-tours-backend.vercel.app',
  'https://gaithtours.com',
  'https://api.gaithtours.com',
  process.env.FRONTEND_URL,
  process.env.BACKEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Stripe webhook route MUST be before express.json() middleware
// This route needs the raw body for signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Handle preflight requests
app.options('*', cors());

// Request logging middleware
app.use((req, res, next) => {
  next();
});

// Initialize Socket.io immediately (not dependent on MongoDB)
initializeSocket(server);
console.log('Socket.IO initialized');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gaithtours', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected successfully');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  // Don't exit process in serverless environment
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Routes
try {
  app.use('/api/auth', require('./routes/auth'));
} catch (error) {
  console.error('Error loading auth routes:', error);
}

try {
  app.use('/api/users', require('./routes/users'));
} catch (error) {
  console.error('Error loading users routes:', error);
}

try {
  app.use('/api/hotels', require('./routes/hotels'));
} catch (error) {
  console.error('Error loading hotels routes:', error);
}

try {
  app.use('/api/reservations', require('./routes/reservations'));
} catch (error) {
  console.error('Error loading reservations routes:', error);
}

try {
  app.use('/api/admin', require('./routes/admin'));
} catch (error) {
  console.error('Error loading admin routes:', error);
}

try {
  app.use('/api/payments', require('./routes/payments'));
} catch (error) {
  console.error('Error loading payments routes:', error);
}

try {
  app.use('/api/uploads', require('./routes/uploads'));
} catch (error) {
  console.error('Error loading uploads routes:', error);
}

// WhatsApp webhook routes (must be before other routes to avoid conflicts)
try {
  app.use('/webhook', require('./routes/webhook'));
} catch (error) {
  console.error('Error loading webhook routes:', error);
}

// WhatsApp admin routes
try {
  app.use('/api/admin/whatsapp', require('./routes/whatsapp-admin'));
} catch (error) {
  console.error('Error loading WhatsApp admin routes:', error);
}

// Test route to verify deployment
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    socketInitialized: !!require('./socket').getIO()
  });
});

// Socket.IO test endpoint
app.get('/api/socket-test', (req, res) => {
  try {
    const io = require('./socket').getIO();
    res.status(200).json({
      success: true,
      message: 'Socket.IO status',
      socketInitialized: !!io,
      connected: io ? io.engine.clientsCount : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Socket.IO error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Fallback polling endpoint for when Socket.IO doesn't work
app.get('/api/whatsapp/messages/poll', require('./middleware/auth').protect, async (req, res) => {
  try {
    // This can be used as a fallback when Socket.IO doesn't work
    const WhatsAppMessage = require('./models/WhatsAppMessage');
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 60000); // Last minute
    
    const newMessages = await WhatsAppMessage.find({
      receivedAt: { $gte: since },
      isFromCustomer: true
    }).sort({ receivedAt: -1 }).limit(50);
    
    res.json({
      success: true,
      messages: newMessages,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Gaith Tours API is running',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Export the server for Vercel
module.exports = server;

// Only start listening if not in serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
