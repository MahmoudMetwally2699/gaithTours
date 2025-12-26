const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow guest bookings
  },
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: true
  },
  clientName: {
    type: String,
    required: true
  },
  clientEmail: {
    type: String,
    required: true
  },
  clientPhone: {
    type: String,
    required: true
  },
  clientNationality: {
    type: String,
    required: true
  },
  hotelName: {
    type: String,
    required: true
  },
  hotelAddress: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },  currency: {
    type: String,
    default: 'SAR'
  },
  status: {
    type: String,
    enum: ['invoiced', 'paid', 'cancelled'],
    default: 'invoiced'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'unpaid', 'pending', 'failed'],
    default: 'unpaid'
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    default: function() {
      // Default due date is 30 days from issue date
      const date = new Date(this.issueDate || Date.now());
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  description: {
    type: String,
    default: function() {
      return `Hotel booking for ${this.hotelName}`;
    }
  },
  pdfPath: {
    type: String
  },
  paymentDetails: {
    stripePaymentIntentId: String,
    paidAt: Date,
    paymentMethod: String
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

// Virtual field for invoice number (same as invoiceId for display)
invoiceSchema.virtual('invoiceNumber').get(function() {
  return this.invoiceId;
});

// Ensure virtual fields are serialized
invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

// Generate unique invoice ID
invoiceSchema.pre('save', async function(next) {
  try {
    if (!this.invoiceId) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');


      // Find the last invoice of the day using this.constructor
      const lastInvoice = await this.constructor.findOne({
        invoiceId: new RegExp(`^INV-${year}${month}${day}-`)
      }).sort({ createdAt: -1 });

      let sequence = 1;
      if (lastInvoice) {
        const lastSequence = parseInt(lastInvoice.invoiceId.split('-')[2]);
        sequence = lastSequence + 1;
      }

      this.invoiceId = `INV-${year}${month}${day}-${String(sequence).padStart(3, '0')}`;
    }

    this.updatedAt = Date.now();
    next();
  } catch (error) {
    console.error('❌ Error generating invoice ID:', error);
    next(error);
  }
});

// Index for better query performance
invoiceSchema.index({ user: 1, createdAt: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceId: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
