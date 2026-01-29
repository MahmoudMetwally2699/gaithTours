/**
 * Test SERP API directly to see response structure
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const KEY_ID = process.env.RATEHAWK_KEY_ID;
const API_KEY = process.env.RATEHAWK_API_KEY;
const baseUrl = 'https://api.worldota.net/api/b2b/v3';

async function test() {
  const results = {};

  // Get region ID first
  const suggest = await axios.post(`${baseUrl}/search/multicomplete/`,
    { query: 'Makkah', language: 'en' },
    { auth: { username: KEY_ID, password: API_KEY } }
  );
  const regionId = suggest.data.data?.regions?.[0]?.id;
  console.log('Region ID:', regionId);

  const today = new Date();
  const checkin = new Date(today.setDate(today.getDate() + 7)).toISOString().split('T')[0];
  const checkout = new Date(today.setDate(today.getDate() + 2)).toISOString().split('T')[0];

  // SERP with English
  console.log('\n--- SERP with language: "en" ---');
  const enSerp = await axios.post(`${baseUrl}/search/serp/region/`,
    { region_id: regionId, checkin, checkout, residency: 'sa',
      guests: [{ adults: 2, children: [] }], currency: 'USD', language: 'en' },
    { auth: { username: KEY_ID, password: API_KEY } }
  );
  const enHotels = enSerp.data.data?.hotels?.slice(0, 3) || [];
  results.serpEnglish = enHotels.map(h => ({
    id: h.id,
    hid: h.hid,
    name: h.name  // Check if name field exists
  }));
  console.log('English SERP hotels:', JSON.stringify(results.serpEnglish, null, 2));

  // SERP with Arabic
  console.log('\n--- SERP with language: "ar" ---');
  const arSerp = await axios.post(`${baseUrl}/search/serp/region/`,
    { region_id: regionId, checkin, checkout, residency: 'sa',
      guests: [{ adults: 2, children: [] }], currency: 'USD', language: 'ar' },
    { auth: { username: KEY_ID, password: API_KEY } }
  );
  const arHotels = arSerp.data.data?.hotels?.slice(0, 3) || [];
  results.serpArabic = arHotels.map(h => ({
    id: h.id,
    hid: h.hid,
    name: h.name  // Check if name field exists
  }));
  console.log('Arabic SERP hotels:', JSON.stringify(results.serpArabic, null, 2));

  // Check raw response fields
  console.log('\n--- First hotel raw fields ---');
  const firstHotel = enSerp.data.data?.hotels?.[0];
  console.log('Available fields:', Object.keys(firstHotel || {}));

  fs.writeFileSync('scripts/serp-test-results.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('\nResults saved to scripts/serp-test-results.json');
}

test().catch(e => console.error(e.response?.data || e.message));
