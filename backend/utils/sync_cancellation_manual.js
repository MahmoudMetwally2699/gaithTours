const mongoose = require('mongoose');
const path = require('path');
// Explicitly resolve path to .env
const envPath = path.resolve(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

const Reservation = require('../models/Reservation');

const syncBooking = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        console.error('❌ MONGODB_URI not found in environment variables!');
        console.log('Attempted to load .env from:', envPath);
        process.exit(1);
    }

    // Mask password in logs
    const maskedUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
    console.log(`Connecting to DB: ${maskedUri}`);

    await mongoose.connect(mongoUri);
    console.log('✅ Connected.');

    // Using the same booking ID from previous steps
    const reservationId = '696bd7023cf40e1ef3dad407';
    const reservation = await Reservation.findById(reservationId);

    if (reservation) {
        console.log(`Reservation found: ${reservation._id}`);
        console.log(`Current Status: ${reservation.status}`);
        console.log(`Current IDs: Partner=${reservation.ratehawkOrderId}, System=${reservation.ratehawkSystemOrderId}`);

        // Update status
        reservation.status = 'cancelled';
        reservation.ratehawkStatus = 'cancelled';
        reservation.cancellationPenalty = {
            amount: 0,
            currency: 'USD'
        };

        // Also ensure IDs are correct if not already (just in case fix_booking_manual didn't run on right DB)
        if (!reservation.ratehawkSystemOrderId) {
             reservation.ratehawkSystemOrderId = '299890524';
             reservation.ratehawkOrderId = 'GH-1768675074851-344ddc5c';
        }

        await reservation.save();
        console.log('✅ Reservation status synced to CANCELLED locally.');
    } else {
        console.log(`❌ Reservation ${reservationId} not found.`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

syncBooking();
