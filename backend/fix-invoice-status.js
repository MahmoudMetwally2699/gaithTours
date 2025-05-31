const mongoose = require('mongoose');
require('dotenv').config();

async function fixInvoiceStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gaithtours');
    console.log('Connected to MongoDB');

    const Invoice = require('./models/Invoice');
    const Payment = require('./models/Payment');

    // Find all completed payments that have corresponding unpaid invoices
    const completedPayments = await Payment.find({ status: 'completed' }).populate('invoice');

    console.log(`Found ${completedPayments.length} completed payments`);

    for (const payment of completedPayments) {
      if (payment.invoice && payment.invoice.paymentStatus !== 'paid') {
        console.log(`Updating invoice ${payment.invoice.invoiceId} from ${payment.invoice.paymentStatus} to paid`);

        // Update the invoice status
        payment.invoice.paymentStatus = 'paid';
        payment.invoice.status = 'paid';

        // Add payment details if not already present
        if (!payment.invoice.paymentDetails || !payment.invoice.paymentDetails.stripePaymentIntentId) {
          payment.invoice.paymentDetails = {
            stripePaymentIntentId: payment.stripePaymentIntentId || payment.transactionId,
            paidAt: payment.processedAt || payment.createdAt,
            paymentMethod: payment.paymentMethod || 'stripe'
          };
        }

        await payment.invoice.save();
        console.log(`✅ Updated invoice ${payment.invoice.invoiceId}`);
      }
    }

    console.log('🎉 Invoice status fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixInvoiceStatus();
