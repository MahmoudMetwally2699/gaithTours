const mongoose = require('mongoose');
const crypto = require('crypto');

const subAdminInvitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissions: {
    type: [{
      type: String,
      enum: ['dashboard', 'clients', 'bookings', 'payments', 'margins', 'whatsapp']
    }],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one permission must be granted'
    }
  },
  token: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  }
});

// Index for faster lookups
subAdminInvitationSchema.index({ email: 1 });
subAdminInvitationSchema.index({ token: 1 });
subAdminInvitationSchema.index({ status: 1 });

// Generate invitation token
subAdminInvitationSchema.statics.generateInvitationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  // Expires in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return { token, hashedToken, expiresAt };
};

// Verify token
subAdminInvitationSchema.statics.verifyToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Check if invitation is valid
subAdminInvitationSchema.methods.isValid = function() {
  return this.status === 'pending' && new Date() < this.expiresAt;
};

module.exports = mongoose.model('SubAdminInvitation', subAdminInvitationSchema);
