/**
 * Test script to check if RateHawk API returns Arabic hotel names
 * Run: node scripts/test-arabic-hotels.js
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const KEY_ID = process.env.RATEHAWK_KEY_ID;
const API_KEY = process.env.RATEHAWK_API_KEY;

if (!KEY_ID || !API_KEY) {
  console.error('❌ Missing RateHawk credentials in .env file');
  process.exit(1);
}

// Output to file to handle Arabic text properly
const output = [];
const log = (msg) => {
  console.log(msg);
  output.push(msg);
};

async function testArabicHotelNames() {
  log('🧪 Testing RateHawk API for Arabic hotel names...\n');

  const baseUrl = 'https://api.worldota.net/api/b2b/v3';
  const contentApiUrl = 'https://api.worldota.net/api/content/v1';

  // Step 1: Get region ID via suggest API
  console.log('📍 Getting region ID for "Makkah"...');

  let regionId;
  try {
    const suggestResponse = await axios.post(
      `${baseUrl}/search/multicomplete/`,
      { query: 'Makkah', language: 'en' },
      {
        auth: { username: KEY_ID, password: API_KEY },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const regions = suggestResponse.data.data?.regions || [];
    if (regions.length === 0) {
      console.error('❌ No regions found for Makkah');
      return;
    }

    regionId = regions[0].id;
    console.log(`✅ Found region: ${regions[0].name} (ID: ${regionId})\n`);
  } catch (error) {
    console.error('❌ Suggest failed:', error.response?.data || error.message);
    return;
  }

  // Get dates for next week
  const today = new Date();
  const checkin = new Date(today);
  checkin.setDate(today.getDate() + 7);
  const checkout = new Date(checkin);
  checkout.setDate(checkin.getDate() + 2);

  const formatDate = (d) => d.toISOString().split('T')[0];

  const payload = {
    checkin: formatDate(checkin),
    checkout: formatDate(checkout),
    residency: 'sa',
    guests: [{ adults: 2, children: [] }],
    region_id: regionId,
    currency: 'USD'
  };

  console.log('📅 Search dates:', payload.checkin, 'to', payload.checkout);

  // Test with English
  console.log('\n' + '='.repeat(60));
  console.log('🇬🇧 ENGLISH (language: "en")');
  console.log('='.repeat(60));

  let englishHotels = [];
  try {
    const englishResponse = await axios.post(
      `${baseUrl}/search/serp/region/`,
      { ...payload, language: 'en' },
      {
        auth: { username: KEY_ID, password: API_KEY },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    englishHotels = englishResponse.data.data?.hotels || [];
    console.log(`Found ${englishHotels.length} hotels\n`);

    // Show first 5 hotels
    englishHotels.slice(0, 5).forEach((hotel, i) => {
      console.log(`${i + 1}. ID: ${hotel.id}`);
      console.log(`   HID: ${hotel.hid}`);
      if (hotel.name) console.log(`   Name: ${hotel.name}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ English request failed:', error.response?.data || error.message);
    return;
  }

  // Test with Arabic
  console.log('\n' + '='.repeat(60));
  console.log('🇸🇦 ARABIC (language: "ar")');
  console.log('='.repeat(60));

  let arabicHotels = [];
  try {
    const arabicResponse = await axios.post(
      `${baseUrl}/search/serp/region/`,
      { ...payload, language: 'ar' },
      {
        auth: { username: KEY_ID, password: API_KEY },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    arabicHotels = arabicResponse.data.data?.hotels || [];
    console.log(`Found ${arabicHotels.length} hotels\n`);

    // Show first 5 hotels
    arabicHotels.slice(0, 5).forEach((hotel, i) => {
      console.log(`${i + 1}. ID: ${hotel.id}`);
      console.log(`   HID: ${hotel.hid}`);
      if (hotel.name) console.log(`   Name: ${hotel.name}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Arabic request failed:', error.response?.data || error.message);
  }

  // Also test Content API for hotel_info
  console.log('\n' + '='.repeat(60));
  console.log('📋 TESTING CONTENT API (hotel_info)');
  console.log('='.repeat(60));

  const testHid = englishHotels[0]?.hid;
  if (!testHid) {
    console.log('No hotel HID to test');
    return;
  }

  console.log(`\nTesting hotel HID: ${testHid}\n`);

  // Test Content API with English
  let enName, arName;
  try {
    console.log('🇬🇧 Content API (English):');
    // Using B2B v3 API instead of content API
    const enContent = await axios.post(
      `${baseUrl}/hotel/info/`,
      { hid: testHid, language: 'en' },
      {
        auth: { username: KEY_ID, password: API_KEY },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const enData = enContent.data.data;
    enName = enData?.name;
    console.log(`  Name: ${enData?.name}`);
    console.log(`  Address: ${enData?.address}`);
    console.log(`  City: ${enData?.city}`);
  } catch (error) {
    console.error('  ❌ Failed:', error.response?.data?.error || error.message);
  }

  // Test Content API with Arabic
  try {
    console.log('\n🇸🇦 Content API (Arabic):');
    const arContent = await axios.post(
      `${baseUrl}/hotel/info/`,
      { hid: testHid, language: 'ar' },
      {
        auth: { username: KEY_ID, password: API_KEY },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const arData = arContent.data.data;
    arName = arData?.name;
    console.log(`  Name: ${arData?.name}`);
    console.log(`  Address: ${arData?.address}`);
    console.log(`  City: ${arData?.city}`);

  } catch (error) {
    console.error('  ❌ Failed:', error.response?.data?.error || error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 CONCLUSION');
  console.log('='.repeat(60));

  if (enName && arName && enName !== arName) {
    console.log('\n✅ RateHawk DOES support Arabic hotel names!');
    console.log(`   EN: ${enName}`);
    console.log(`   AR: ${arName}`);
    console.log('\nWe can implement Arabic hotel names using the Content API.\n');
  } else {
    console.log('\n❌ Hotel names appear to be the same in both languages.');
    console.log('   RateHawk may not have Arabic translations for this hotel.\n');
  }
}

testArabicHotelNames().catch(console.error);
