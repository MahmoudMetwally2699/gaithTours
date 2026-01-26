/**
 * POI Dump Import Script - TEST VERSION (5000 records limit)
 *
 * Usage: node scripts/importPoiDumpTest.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const fzstd = require('fzstd');
const HotelPOI = require('../models/HotelPOI');
const rateHawkService = require('../utils/RateHawkService');

// TEST: Limit to 5000 records
const BATCH_SIZE = 1000;
const MAX_RECORDS = 5000;

async function importPoiDump(language = 'en') {
  console.log('🧪 TEST MODE: Importing only 5000 POI records');
  console.log('🚀 Starting POI dump import...');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('📥 Fetching POI dump URL...');
    const dumpInfo = await rateHawkService.getPoiDump(language);

    if (!dumpInfo.success) {
      console.error('❌ Failed:', dumpInfo.message);
      process.exit(1);
    }

    console.log(`📍 URL: ${dumpInfo.url}`);
    console.log('⬇️  Downloading...');

    const response = await axios({
      method: 'get',
      url: dumpInfo.url,
      responseType: 'arraybuffer',
      timeout: 600000
    });

    console.log(`📦 Downloaded ${(response.data.byteLength / 1024 / 1024).toFixed(2)} MB`);

    console.log('🔓 Decompressing...');
    const decompressed = fzstd.decompress(new Uint8Array(response.data));
    const jsonData = new TextDecoder().decode(decompressed);
    console.log(`📦 Decompressed ${(jsonData.length / 1024 / 1024).toFixed(2)} MB`);

    const lines = jsonData.split('\n').filter(line => line.trim());
    console.log(`📊 Found ${lines.length} records, importing first ${MAX_RECORDS}`);

    let batch = [];
    let totalProcessed = 0;
    let totalImported = 0;

    for (const line of lines) {
      if (totalProcessed >= MAX_RECORDS) break;
      if (!line.trim()) continue;

      try {
        const record = JSON.parse(line);
        let hid = record.hid || (record.id ? parseInt(Array.isArray(record.id) ? record.id[0] : record.id) : null);

        if (!hid || isNaN(hid)) continue;

        batch.push({
          hid,
          hotelId: Array.isArray(record.id) ? record.id[0] : record.id,
          poi: (record.poi || []).map(p => ({
            type: p.type || 'Unspecified',
            sub_type: p.sub_type || 'unspecified',
            name: p.name || '',
            distance: p.distance || 0
          })),
          language,
          dumpDate: dumpInfo.last_update,
          lastUpdated: new Date()
        });

        totalProcessed++;

        if (batch.length >= BATCH_SIZE) {
          const result = await HotelPOI.bulkUpsertFromDump(batch);
          totalImported += result.upsertedCount + result.modifiedCount;
          console.log(`   📊 ${totalProcessed}/${MAX_RECORDS} (${totalImported} imported)`);
          batch = [];
        }
      } catch (e) {}
    }

    if (batch.length > 0) {
      const result = await HotelPOI.bulkUpsertFromDump(batch);
      totalImported += result.upsertedCount + result.modifiedCount;
    }

    console.log('\n========================================');
    console.log(`✅ Imported ${totalImported} POI records`);
    console.log('========================================\n');

    const sample = await HotelPOI.findOne().lean();
    if (sample) {
      console.log(`Sample HID ${sample.hid}: ${sample.poi?.length || 0} POIs`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Done!');
  }
}

importPoiDump('en');
