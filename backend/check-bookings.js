const mongoose = require('mongoose');

// Load all models
const User = require('./models/User');
const Reservation = require('./models/Reservation');
const Invoice = require('./models/Invoice');

async function checkBookings() {
  try {
    // Connect to database
    await mongoose.connect('mongodb+srv://mahmmetwally26:Mah%401999@cluster0.wmc9x7o.mongodb.net/hotel-booking-app');
    console.log('✅ Connected to database');

    // Find pending bookings
    const pendingBookings = await Reservation.find({ status: 'pending' })
      .populate('user')
      .populate('hotel');

    console.log(`📋 Found ${pendingBookings.length} pending bookings`);

    if (pendingBookings.length > 0) {
      console.log('\n📄 First pending booking:');
      const booking = pendingBookings[0];
      console.log({
        id: booking._id,
        touristName: booking.touristName,
        email: booking.email,
        phone: booking.phone,
        nationality: booking.nationality,
        status: booking.status,
        user: booking.user ? {
          id: booking.user._id,
          name: booking.user.name,
          email: booking.user.email,
          role: booking.user.role
        } : 'No user',
        hotel: booking.hotel ? {
          name: booking.hotel.name,
          address: booking.hotel.address
        } : 'No hotel'
      });
    }

    // Also check if there are any existing invoices
    const invoiceCount = await Invoice.countDocuments();
    console.log(`💰 Total invoices in database: ${invoiceCount}`);

    if (invoiceCount > 0) {
      const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
      console.log(`📄 Last invoice ID: ${lastInvoice.invoiceId}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

checkBookings();
