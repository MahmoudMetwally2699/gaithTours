/**
 * Cancel Test Booking
 * Run after successful test booking to cancel it (required by ETG)
 */
require('dotenv').config();
const axios = require('axios');

const PARTNER_ORDER_ID = process.argv[2] || 'test_1768340199568_6fekqltiq';

async function cancelBooking() {
  console.log('\n🚫 Cancelling test booking...');
  console.log(`   Partner Order ID: ${PARTNER_ORDER_ID}`);

  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.worldota.net/api/b2b/v3/hotel/order/cancel/',
      auth: {
        username: process.env.RATEHAWK_KEY_ID,
        password: process.env.RATEHAWK_API_KEY
      },
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        partner_order_id: PARTNER_ORDER_ID
      }
    });

    console.log('\n📥 Response:', JSON.stringify(response.data, null, 2));

    if (response.data.status === 'ok') {
      console.log('\n✅ Booking cancelled successfully!');
    } else {
      console.log('\n⚠️ Cancellation response:', response.data);
    }
  } catch (error) {
    console.error('\n❌ Cancel error:', error.response?.data || error.message);
  }
}

cancelBooking();
