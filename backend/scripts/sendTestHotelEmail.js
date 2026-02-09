/**
 * Send a test Hotel Confirmation Email with dummy data
 * Run: node backend/scripts/sendTestHotelEmail.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sendHotelConfirmationEmail } = require('../utils/emailService');

// Dummy data for testing
const testData = {
  hotelEmail: 'mahmetwally99@gmail.com', // Send to user's email for testing
  hotelName: 'Grand Palace Hotel & Spa',
  guestName: 'Ahmed Mohamed',
  guestEmail: 'ahmed.mohamed@email.com',
  guestPhone: '+201234567890',
  nationality: 'Egyptian',
  checkInDate: '2026-02-15',
  checkOutDate: '2026-02-18',
  roomType: 'Deluxe Double Room with Sea View',
  numberOfGuests: 2,
  numberOfRooms: 1,
  meal: 'Breakfast Included',
  specialRequests: 'Late check-in around 11 PM. Please prepare a room on a high floor with a nice view. Non-smoking room preferred.',
  reservationId: 'GH-1707523456-abc123',
  totalPrice: 450.00,
  currency: 'USD'
};

async function sendTestEmail() {
  console.log('📧 Sending test hotel confirmation email...');
  console.log('   To:', testData.hotelEmail);
  console.log('');

  try {
    const result = await sendHotelConfirmationEmail(testData);
    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', result.messageId);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
  }
}

sendTestEmail();
