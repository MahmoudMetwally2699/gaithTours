const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { initializeSocket } = require('./socket');
const cacheWarmer = require('./utils/cacheWarmer');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Trust proxy - required for Vercel and other reverse proxies
// Security middleware
app.use(helmet());
app.use(compression()); // Gzip compress all responses (~60-80% smaller)
app.set('trust proxy', 1);


// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://gaithtours.vercel.app',
  'https://gaith-tours-one.vercel.app',
  'https://gaith-tours-backend.vercel.app',
  'https://gaithtours.com',
  'https://www.gaithtours.com',
  'https://api.gaithtours.com',
  process.env.FRONTEND_URL,
  process.env.BACKEND_URL
].filter(Boolean);

// Allow all Vercel preview URLs (*.vercel.app)
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Allow all *.vercel.app domains
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  return false;
};

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.error('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-guest-id'],
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
  app.use('/api/bookings', require('./routes/bookings'));
} catch (error) {
  console.error('Error loading bookings routes:', error);
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

// Margin rules routes (Profit Margin Management)
try {
  app.use('/api/admin/margins', require('./routes/margins'));
  console.log('✅ Margin routes loaded');
} catch (error) {
  console.error('Error loading margin routes:', error);
}

// Sub-admin management routes
try {
  app.use('/api/admin', require('./routes/sub-admin'));
  console.log('✅ Sub-admin routes loaded');
} catch (error) {
  console.error('Error loading sub-admin routes:', error);
}

// Promo codes routes
try {
  app.use('/api/promo-codes', require('./routes/promo-codes'));
  console.log('✅ Promo codes routes loaded');
} catch (error) {
  console.error('Error loading promo codes routes:', error);
}

// Analytics routes
try {
  app.use('/api/admin/analytics', require('./routes/analytics'));
  console.log('✅ Analytics routes loaded');
} catch (error) {
  console.error('Error loading analytics routes:', error);
}

// Reviews routes
try {
  app.use('/api/reviews', require('./routes/reviews'));
  console.log('✅ Reviews routes loaded');
} catch (error) {
  console.error('Error loading reviews routes:', error);
}

// TripAdvisor routes
try {
  app.use('/api/tripadvisor', require('./routes/tripadvisor'));
  console.log('✅ TripAdvisor routes loaded');
} catch (error) {
  console.error('Error loading TripAdvisor routes:', error);
}

// Promotional banners routes
try {
  app.use('/api/promotional-banners', require('./routes/promotional-banners'));
  console.log('✅ Promotional banners routes loaded');
} catch (error) {
  console.error('Error loading promotional banners routes:', error);
}

// Favorites routes (Server-side Wishlist)
try {
  app.use('/api/favorites', require('./routes/favorites'));
  console.log('✅ Favorites routes loaded');
} catch (error) {
  console.error('Error loading favorites routes:', error);
}

// Loyalty program routes
try {
  app.use('/api/loyalty', require('./routes/loyalty'));
  console.log('✅ Loyalty routes loaded');
} catch (error) {
  console.error('Error loading loyalty routes:', error);
}

// Partner portal routes
try {
  app.use('/api/partners', require('./routes/partners'));
  console.log('✅ Partner routes loaded');
} catch (error) {
  console.error('Error loading partner routes:', error);
}

// Price alerts routes (Price Watch feature)
try {
  app.use('/api/price-alerts', require('./routes/price-alerts'));
  console.log('✅ Price alerts routes loaded');
} catch (error) {
  console.error('Error loading price alerts routes:', error);
}

// Blog routes (public)
try {
  app.use('/api/blog', require('./routes/blog'));
  console.log('✅ Blog routes loaded');
} catch (error) {
  console.error('Error loading blog routes:', error);
}

// Blog admin routes
try {
  app.use('/api/admin/blog', require('./routes/blog-admin'));
  console.log('✅ Blog admin routes loaded');
} catch (error) {
  console.error('Error loading blog admin routes:', error);
}

// Support chat routes
try {
  app.use('/api/support-chat', require('./routes/support-chat'));
  console.log('✅ Support chat routes loaded');
} catch (error) {
  console.error('Error loading support chat routes:', error);
}

// Push notification routes
try {
  app.use('/api/push', require('./routes/push-notifications'));
  console.log('✅ Push notification routes loaded');
  // Initialize web-push VAPID
  const { initializeWebPush } = require('./utils/pushService');
  initializeWebPush();
} catch (error) {
  console.error('Error loading push notification routes:', error);
}

// Debug routes (development only)
if (process.env.NODE_ENV !== 'production') {
  try {
    app.use('/api/debug', require('./routes/debug'));
    console.log('✅ Debug routes loaded');
  } catch (error) {
    console.error('Error loading debug routes:', error);
  }
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

// Manual cache warming endpoint (protected)
app.post('/api/admin/warm-cache', async (req, res) => {
  try {
    const { adminKey } = req.body;

    // Simple admin key check
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    console.log('🔥 Manual cache warming triggered');

    // Run cache warming in background
    cacheWarmer.warmAllDestinations().catch(err => {
      console.error('Cache warming error:', err);
    });

    res.json({
      success: true,
      message: 'Cache warming started in background'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
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

    // Start cache warmer for popular destinations (only in non-serverless env)
    if (process.env.ENABLE_CACHE_WARMER === 'true') {
      console.log('🌡️  Starting cache warmer...');
      cacheWarmer.startPeriodicWarmup();
    }
  });
}
