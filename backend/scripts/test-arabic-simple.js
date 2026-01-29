/**
 * Minimal test to check RateHawk Arabic support
 * Run: node scripts/test-arabic-simple.js
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const KEY_ID = process.env.RATEHAWK_KEY_ID;
const API_KEY = process.env.RATEHAWK_API_KEY;
const baseUrl = 'https://api.worldota.net/api/b2b/v3';

async function test() {
  const results = { timestamp: new Date().toISOString() };

  // Get a sample hotel HID from Makkah
  try {
    // First get region
    const suggest = await axios.post(`${baseUrl}/search/multicomplete/`,
      { query: 'Makkah', language: 'en' },
      { auth: { username: KEY_ID, password: API_KEY } }
    );
    const regionId = suggest.data.data?.regions?.[0]?.id;
    results.regionId = regionId;

    // Get hotels
    const today = new Date();
    const checkin = new Date(today.setDate(today.getDate() + 7)).toISOString().split('T')[0];
    const checkout = new Date(today.setDate(today.getDate() + 2)).toISOString().split('T')[0];

    const search = await axios.post(`${baseUrl}/search/serp/region/`,
      { region_id: regionId, checkin, checkout, residency: 'sa',
        guests: [{ adults: 2, children: [] }], currency: 'USD', language: 'en' },
      { auth: { username: KEY_ID, password: API_KEY } }
    );

    const hotels = search.data.data?.hotels || [];
    results.hotelCount = hotels.length;

    if (hotels.length > 0) {
      const testHid = hotels[0].hid;
      results.testHid = testHid;
      results.serpHotelId = hotels[0].id;

      // Test hotel/info with English
      try {
        const enInfo = await axios.post(`${baseUrl}/hotel/info/`,
          { hid: testHid, language: 'en' },
          { auth: { username: KEY_ID, password: API_KEY } }
        );
        results.english = {
          name: enInfo.data.data?.name,
          address: enInfo.data.data?.address,
          city: enInfo.data.data?.city
        };
      } catch (e) {
        results.englishError = e.response?.data || e.message;
      }

      // Test hotel/info with Arabic
      try {
        const arInfo = await axios.post(`${baseUrl}/hotel/info/`,
          { hid: testHid, language: 'ar' },
          { auth: { username: KEY_ID, password: API_KEY } }
        );
        results.arabic = {
          name: arInfo.data.data?.name,
          address: arInfo.data.data?.address,
          city: arInfo.data.data?.city
        };
      } catch (e) {
        results.arabicError = e.response?.data || e.message;
      }

      // Compare
      if (results.english && results.arabic) {
        results.hasArabicTranslation = results.english.name !== results.arabic.name;
      }
    }
  } catch (e) {
    results.error = e.response?.data || e.message;
  }

  // Write results to file
  fs.writeFileSync('scripts/arabic-test-results.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('Results written to scripts/arabic-test-results.json');
  console.log(JSON.stringify(results, null, 2));
}

test();
