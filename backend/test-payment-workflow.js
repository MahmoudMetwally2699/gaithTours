const mongoose = require('mongoose');
const User = require('./models/User');
const Invoice = require('./models/Invoice');
const { sendInvoiceEmail } = require('./utils/emailService');
require('dotenv').config();

async function createTestInvoice() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a test user or create one
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword123', // In real app, this would be hashed
        phone: '+966501234567',
        nationality: 'Saudi Arabia',
        isVerified: true
      });
      console.log('✅ Created test user:', testUser.email);
    } else {
      console.log('✅ Found existing test user:', testUser.email);
    }

    // Create a test invoice
    const invoice = await Invoice.create({
      user: testUser._id,
      invoiceId: `INV-${Date.now()}`,
      clientName: testUser.name,
      clientEmail: testUser.email,      hotelName: 'Burj Al Arab Jumeirah',
      amount: 1687.50,
      currency: 'SAR',
      description: 'Hotel booking for 2 nights - Deluxe Suite',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      paymentStatus: 'unpaid',
      items: [
        {
          description: 'Deluxe Suite - 2 nights',
          quantity: 1,
          unitPrice: 1500.00,
          total: 1500.00
        },
        {
          description: 'City Tax',
          quantity: 1,
          unitPrice: 187.50,
          total: 187.50
        }
      ]
    });

    console.log('✅ Created test invoice:', invoice.invoiceId);
    console.log('📋 Invoice details:');
    console.log(`   - Amount: ${invoice.amount} ${invoice.currency}`);
    console.log(`   - Hotel: ${invoice.hotelName}`);
    console.log(`   - Client: ${invoice.clientName}`);
    console.log(`   - Status: ${invoice.paymentStatus}`);

    // Send invoice email
    console.log('\n📧 Sending invoice email...');
    await sendInvoiceEmail(invoice);
    console.log('✅ Invoice email sent successfully!');

    console.log('\n🔗 To test payment:');
    console.log('1. Start the frontend application');
    console.log('2. Login with email: test@example.com');
    console.log('3. Go to Profile > Invoices tab');
    console.log('4. Click "Pay Now" on the invoice');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the script
createTestInvoice();
