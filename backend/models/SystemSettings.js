const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // Booking approval toggle
  // false = direct booking (current flow), true = require admin approval after payment
  requireBookingApproval: {
    type: Boolean,
    default: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
systemSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get settings (singleton pattern - same as LoyaltySettings)
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
