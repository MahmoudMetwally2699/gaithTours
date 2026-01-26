/**
 * POI Dump Import Script
 *
 * Downloads and imports hotel POI (Points of Interest) data from ETG/RateHawk API
 * This enables the "Hotel area info" section showing nearby attractions, restaurants, transit, etc.
 *
 * Usage: node scripts/importPoiDump.js [--language=en]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const fzstd = require('fzstd');
const readline = require('readline');
const { Readable } = require('stream');
const HotelPOI = require('../models/HotelPOI');
const rateHawkService = require('../utils/RateHawkService');

// Configuration
const BATCH_SIZE = 1000;
const MAX_RECORDS = process.env.POI_IMPORT_LIMIT ? parseInt(process.env.POI_IMPORT_LIMIT) : null;

async function importPoiDump(language = 'en') {
  console.log('🚀 Starting POI dump import...');
  console.log(`📍 Language: ${language}`);

  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get dump URL from API
    console.log('📥 Fetching POI dump URL from RateHawk API...');
    const dumpInfo = await rateHawkService.getPoiDump(language);

    if (!dumpInfo.success) {
      console.error('❌ Failed to get POI dump:', dumpInfo.message);
      process.exit(1);
    }

    console.log(`📍 POI dump URL: ${dumpInfo.url}`);
    console.log(`📅 Last updated: ${dumpInfo.last_update}`);

    // Download the dump file
    console.log('⬇️  Downloading POI dump (this may take a while)...');
    const response = await axios({
      method: 'get',
      url: dumpInfo.url,
      responseType: 'arraybuffer',
      timeout: 600000 // 10 minutes timeout for large files
    });

    console.log(`📦 Downloaded ${(response.data.byteLength / 1024 / 1024).toFixed(2)} MB`);

    // Check if the file is zstd compressed
    const isZstd = dumpInfo.url.endsWith('.zst') || dumpInfo.url.includes('.json.zst');

    let jsonData;
    if (isZstd) {
      console.log('🔓 Decompressing zstd file...');
      const compressedData = new Uint8Array(response.data);
      const decompressedData = fzstd.decompress(compressedData);
      jsonData = new TextDecoder().decode(decompressedData);
      console.log(`📦 Decompressed to ${(jsonData.length / 1024 / 1024).toFixed(2)} MB`);
    } else {
      jsonData = response.data.toString('utf8');
    }

    // Split into lines (JSONL format)
    const lines = jsonData.split('\n').filter(line => line.trim());
    console.log(`📊 Found ${lines.length} records to process`);

    let batch = [];
    let totalProcessed = 0;
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    console.log('📊 Processing POI records...');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const record = JSON.parse(line);

        // Extract HID (prefer numeric hid, fallback to parsing id)
        let hid = record.hid;
        if (!hid && record.id) {
          // Try to extract numeric ID from string
          if (Array.isArray(record.id)) {
            hid = parseInt(record.id[0]);
          } else {
            hid = parseInt(record.id);
          }
        }

        if (!hid || isNaN(hid)) {
          totalSkipped++;
          continue;
        }

        // Transform POI data
        const poiData = {
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
        };

        batch.push(poiData);
        totalProcessed++;

        // Process batch when full
        if (batch.length >= BATCH_SIZE) {
          try {
            const result = await HotelPOI.bulkUpsertFromDump(batch);
            totalImported += result.upsertedCount + result.modifiedCount;
            console.log(`   📊 Processed ${totalProcessed} records (${totalImported} imported)`);
          } catch (batchError) {
            console.error(`   ❌ Batch error: ${batchError.message}`);
            totalErrors += batch.length;
          }
          batch = [];
        }

        // Check if we've hit the limit
        if (MAX_RECORDS && totalProcessed >= MAX_RECORDS) {
          console.log(`⚠️  Reached import limit of ${MAX_RECORDS} records`);
          break;
        }

      } catch (parseError) {
        totalErrors++;
        if (totalErrors < 10) {
          console.error(`   ⚠️ Parse error: ${parseError.message}`);
        }
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      try {
        const result = await HotelPOI.bulkUpsertFromDump(batch);
        totalImported += result.upsertedCount + result.modifiedCount;
      } catch (batchError) {
        console.error(`   ❌ Final batch error: ${batchError.message}`);
        totalErrors += batch.length;
      }
    }

    console.log('\n========================================');
    console.log('📊 POI Import Summary');
    console.log('========================================');
    console.log(`   Total processed: ${totalProcessed}`);
    console.log(`   Total imported:  ${totalImported}`);
    console.log(`   Total skipped:   ${totalSkipped}`);
    console.log(`   Total errors:    ${totalErrors}`);
    console.log('========================================\n');

    // Show sample of imported data
    const sampleCount = await HotelPOI.countDocuments();
    console.log(`📦 Total POI records in database: ${sampleCount}`);

    const sample = await HotelPOI.findOne().lean();
    if (sample) {
      console.log(`\n📍 Sample POI record (HID: ${sample.hid}):`);
      console.log(`   POI count: ${sample.poi?.length || 0}`);
      if (sample.poi && sample.poi.length > 0) {
        console.log('   First 3 POIs:');
        sample.poi.slice(0, 3).forEach(p => {
          console.log(`     - ${p.name} (${p.type}/${p.sub_type}) - ${p.distance}m`);
        });
      }
    }

    console.log('\n✅ POI import completed successfully!');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let language = 'en';

for (const arg of args) {
  if (arg.startsWith('--language=')) {
    language = arg.split('=')[1];
  }
}

// Run the import
importPoiDump(language);
