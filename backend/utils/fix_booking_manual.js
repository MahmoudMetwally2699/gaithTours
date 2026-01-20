const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Reservation = require('../models/Reservation');

const fixBooking = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/gaith_tours'; // Fallback
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    // Partner Order ID from logs: GH-1768675074851-344ddc5c
    // RateHawk Order ID from logs: 299890524
    // Booking ID from logs: 696bd7023cf40e1ef3dad407

    // Try finding by ID
    let reservation = await Reservation.findById('696bd7023cf40e1ef3dad407');

    if (!reservation) {
        console.log('Reservation not found by ID, trying ratehawkOrderId...');
        reservation = await Reservation.findOne({ ratehawkOrderId: '299890524' });
    }

    if (reservation) {
        console.log(`Found reservation: ${reservation._id}`);
        console.log(`Current ratehawkOrderId: ${reservation.ratehawkOrderId}`);

        reservation.ratehawkSystemOrderId = '299890524';
        reservation.ratehawkOrderId = 'GH-1768675074851-344ddc5c';

        await reservation.save();
        console.log('✅ Reservation updated successfully!');
        console.log(`New ratehawkOrderId: ${reservation.ratehawkOrderId}`);
        console.log(`New ratehawkSystemOrderId: ${reservation.ratehawkSystemOrderId}`);
    } else {
        console.log('❌ Reservation not found.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

fixBooking();
