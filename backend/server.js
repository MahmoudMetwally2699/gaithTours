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

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for Socket.io connections
    return req.path.startsWith('/socket.io');
  }
});
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://gaithtours.vercel.app',
  'https://gaith-tours.vercel.app',
  'https://gaith-tours-six.vercel.app',
  'https://gaith-tours-backend.vercel.app',
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
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  if (req.path !== '/api/payments/webhook') {
    console.log('Body:', req.body);
  }
  next();
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gaithtours', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected successfully');
  // Initialize Socket.io after MongoDB connection
  initializeSocket(server);
  console.log('Socket.io initialized successfully');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Routes
console.log('Setting up routes...');
try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('Auth routes loaded successfully');
} catch (error) {
  console.error('Error loading auth routes:', error);
}

try {
  app.use('/api/users', require('./routes/users'));
  console.log('Users routes loaded successfully');
} catch (error) {
  console.error('Error loading users routes:', error);
}

try {
  app.use('/api/hotels', require('./routes/hotels'));
  console.log('Hotels routes loaded successfully');
} catch (error) {
  console.error('Error loading hotels routes:', error);
}

try {
  app.use('/api/reservations', require('./routes/reservations'));
  console.log('Reservations routes loaded successfully');
} catch (error) {
  console.error('Error loading reservations routes:', error);
}

try {
  app.use('/api/admin', require('./routes/admin'));
  console.log('Admin routes loaded successfully');
} catch (error) {
  console.error('Error loading admin routes:', error);
}

try {
  app.use('/api/payments', require('./routes/payments'));
  console.log('Payments routes loaded successfully');
} catch (error) {
  console.error('Error loading payments routes:', error);
}

try {
  app.use('/api/uploads', require('./routes/uploads'));
  console.log('Uploads routes loaded successfully');
} catch (error) {
  console.error('Error loading uploads routes:', error);
}

// WhatsApp webhook routes (must be before other routes to avoid conflicts)
try {
  app.use('/webhook', require('./routes/webhook'));
  console.log('Webhook routes loaded successfully');
} catch (error) {
  console.error('Error loading webhook routes:', error);
}

// WhatsApp admin routes
try {
  app.use('/api/admin/whatsapp', require('./routes/whatsapp-admin'));
  console.log('WhatsApp admin routes loaded successfully');
} catch (error) {
  console.error('Error loading WhatsApp admin routes:', error);
}

// Test route to verify deployment
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
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

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
