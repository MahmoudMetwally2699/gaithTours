const axios = require('axios');
require('dotenv').config();

const KEY_ID = process.env.RATEHAWK_KEY_ID;
const API_KEY = process.env.RATEHAWK_API_KEY;

async function inspectContentAPI() {
    console.log('🔍 Inspecting Content API Response Structure\n');

    const testHID = 11199952; // Pyramids Land Hotel

    try {
        const response = await axios.post(
            'https://api.worldota.net/api/content/v1/hotel_content_by_ids/',
            {
                hids: [testHID],
                language: 'en'
            },
            {
                auth: {
                    username: KEY_ID,
                    password: API_KEY
                }
            }
        );

        const hotel = response.data.data?.[0];

        if (hotel) {
            console.log('📋 Full Hotel Object Structure:\n');
            console.log(JSON.stringify(hotel, null, 2));
        } else {
            console.log('❌ No hotel data returned');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

inspectContentAPI();
