const mongoose = require('mongoose');
require('dotenv').config();

async function checkInvoices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gaithtours');
    console.log('Connected to MongoDB');    const Invoice = require('./models/Invoice');
    const User = require('./models/User'); // Import User model to avoid schema error
    const invoices = await Invoice.find({});

    console.log('\n📋 Current invoices in database:');
    console.log('Total invoices:', invoices.length);

    if (invoices.length > 0) {
      invoices.forEach((inv, i) => {
        console.log(`${i + 1}. Invoice #${inv.invoiceNumber} - ${inv.clientName} - ${inv.amount} ${inv.currency || 'SAR'} - Status: ${inv.paymentStatus}`);
        if (inv.paymentDetails) {
          console.log(`   Payment Details: Method: ${inv.paymentDetails.paymentMethod || 'N/A'}, Paid: ${inv.paymentDetails.paidAt || 'N/A'}`);
        }
      });
    } else {
      console.log('❌ No invoices found in database.');
      console.log('\n💡 Let\'s create some test invoices...');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInvoices();
