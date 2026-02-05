const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name must be no more than 50 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [function() { return !this.socialProvider; }, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    validate: {
      validator: function(password) {
        // Skip validation for social auth users (no password)
        if (!password && this.socialProvider) return true;
        // At least one uppercase, one lowercase, one number, one special character
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    },
    select: false
  },
  socialProvider: {
    type: String,
    enum: ['google', 'facebook', null],
    default: null
  },
  socialId: {
    type: String,
    sparse: true
  },
  profilePicture: {
    type: String
  },
  phone: {
    type: String,
    required: [function() { return !this.socialProvider; }, 'Phone number is required'],
    validate: {
      validator: function(phone) {
        // Skip validation for social auth users without phone
        if (!phone && this.socialProvider) return true;
        if (!phone) return false;
        // Basic international phone number validation
        return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/[\s-]/g, ''));
      },
      message: 'Please enter a valid phone number'
    }
  },
  nationality: {
    type: String,
    required: [function() { return !this.socialProvider; }, 'Nationality is required'],
    minlength: [2, 'Nationality must be at least 2 characters long']
  },
  lastSearchDestination: {
    type: String,
    trim: true
  },
  preferredLanguage: {
    type: String,
    enum: ['en', 'ar'],
    default: 'en'
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin', 'sub_admin', 'partner'],
    default: 'user'
  },
  adminPermissions: {
    type: [{
      type: String,
      enum: ['dashboard', 'clients', 'bookings', 'payments', 'margins', 'whatsapp', 'admin_management']
    }],
    default: []
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  // Phone verification fields
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  phoneVerificationCode: String,
  phoneVerificationExpires: Date,
  phoneVerificationLastSent: Date,
  // Favorites (Server-side Wishlist)
  favorites: [{
    type: String // Hotel IDs (hid)
  }],
  // Loyalty Program
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  loyaltyTier: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    default: 'Bronze'
  },
  totalSpent: {
    type: Number,
    default: 0 // Total USD spent on bookings
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate email verification token
userSchema.methods.generateVerificationToken = function() {
  // Generate random token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Hash and store in database
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Set expiry to 24 hours from now
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Return unhashed token to send via email
  return verificationToken;
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.phoneVerificationCode;
  delete userObject.phoneVerificationExpires;
  delete userObject.phoneVerificationLastSent;
  return userObject;
};

// Instance method to generate phone verification code
userSchema.methods.generatePhoneVerificationCode = function() {
  // Generate random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash and store in database for security
  this.phoneVerificationCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');

  // Set expiry to 10 minutes from now
  this.phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);

  // Track when code was last sent (for rate limiting)
  this.phoneVerificationLastSent = new Date();

  // Return unhashed code to send via WhatsApp
  return code;
};

module.exports = mongoose.model('User', userSchema);
