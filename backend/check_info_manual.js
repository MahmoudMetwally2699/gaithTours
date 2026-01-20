require('dotenv').config();
const axios = require('axios');

const PARTNER_ORDER_ID = 'GH-1768675074851-344ddc5c';

async function checkInfo() {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.worldota.net/api/b2b/v3/hotel/order/cancel/info/',
      auth: {
        username: process.env.RATEHAWK_KEY_ID,
        password: process.env.RATEHAWK_API_KEY
      },
      headers: { 'Content-Type': 'application/json' },
      data: { partner_order_id: PARTNER_ORDER_ID }
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
}

checkInfo();
