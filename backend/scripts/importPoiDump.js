/**
 * POI Dump Import Script - STREAMING VERSION
 *
 * Downloads and imports hotel POI data using streaming to avoid memory issues
 *
 * Usage: node scripts/importPoiDump.js [--language=en] [--limit=5000]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const HotelPOI = require('../models/HotelPOI');
const rateHawkService = require('../utils/RateHawkService');

// Configuration
const BATCH_SIZE = 500;
const TEMP_DIR = path.join(__dirname, '../temp');

async function importPoiDump(language = 'en', limit = null) {
  console.log('🚀 Starting POI dump import (STREAMING VERSION)...');
  console.log(`📍 Language: ${language}`);
  if (limit) console.log(`📊 Limit: ${limit} records`);

  // Ensure temp directory exists
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const tempZstFile = path.join(TEMP_DIR, 'poi_dump.json.zst');
  const tempJsonFile = path.join(TEMP_DIR, 'poi_dump.json');

  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get dump URL from API
    console.log('📥 Fetching POI dump URL...');
    const dumpInfo = await rateHawkService.getPoiDump(language);

    if (!dumpInfo.success) {
      console.error('❌ Failed:', dumpInfo.message);
      process.exit(1);
    }

    console.log(`📍 URL: ${dumpInfo.url}`);

    // Download file to disk instead of memory
    console.log('⬇️  Downloading POI dump to disk...');
    const writer = fs.createWriteStream(tempZstFile);

    const response = await axios({
      method: 'get',
      url: dumpInfo.url,
      responseType: 'stream',
      timeout: 600000
    });

    let downloadedBytes = 0;
    response.data.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      process.stdout.write(`\r   Downloaded: ${(downloadedBytes / 1024 / 1024).toFixed(1)} MB`);
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`\n✅ Downloaded ${(downloadedBytes / 1024 / 1024).toFixed(2)} MB`);

    // Decompress using zstd command line tool (if available) or use streaming
    console.log('🔓 Decompressing with zstd...');

    try {
      // Try using system zstd first (more memory efficient)
      await new Promise((resolve, reject) => {
        const zstd = spawn('zstd', ['-d', tempZstFile, '-o', tempJsonFile, '-f']);
        zstd.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`zstd exited with code ${code}`));
        });
        zstd.on('error', reject);
      });
      console.log('✅ Decompressed with system zstd');
    } catch (zstdError) {
      console.log('⚠️  System zstd not available, using Node.js decompression...');

      // Fallback: Use fzstd with streaming
      const fzstd = require('fzstd');
      const compressedData = fs.readFileSync(tempZstFile);
      const decompressed = fzstd.decompress(new Uint8Array(compressedData));
      fs.writeFileSync(tempJsonFile, Buffer.from(decompressed));
      console.log('✅ Decompressed with fzstd');
    }

    // Clean up compressed file
    fs.unlinkSync(tempZstFile);

    // Process JSON file line by line (streaming)
    console.log('📊 Processing POI records...');

    const fileStream = fs.createReadStream(tempJsonFile, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let batch = [];
    let totalProcessed = 0;
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for await (const line of rl) {
      if (!line.trim()) continue;
      if (limit && totalProcessed >= limit) break;

      try {
        const record = JSON.parse(line);

        let hid = record.hid;
        if (!hid && record.id) {
          hid = parseInt(Array.isArray(record.id) ? record.id[0] : record.id);
        }

        if (!hid || isNaN(hid)) {
          totalSkipped++;
          continue;
        }

        batch.push({
          hid,
          hotelId: Array.isArray(record.id) ? record.id[0] : record.id,

          poi: (record.pois || []).map(p => ({
            type: p.poi_type || 'Unspecified',
            sub_type: p.poi_subtype || 'unspecified',
            name: p.poi_name || p.poi_name_en || '',
            distance: p.distance || 0
          })),
          language,
          dumpDate: dumpInfo.last_update,
          lastUpdated: new Date()
        });

        totalProcessed++;

        if (batch.length >= BATCH_SIZE) {
          try {
            const result = await HotelPOI.bulkUpsertFromDump(batch);
            totalImported += result.upsertedCount + result.modifiedCount;
            process.stdout.write(`\r   Processed: ${totalProcessed} | Imported: ${totalImported}`);
          } catch (e) {
            totalErrors += batch.length;
          }
          batch = [];
        }

      } catch (parseError) {
        totalErrors++;
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      try {
        const result = await HotelPOI.bulkUpsertFromDump(batch);
        totalImported += result.upsertedCount + result.modifiedCount;
      } catch (e) {
        totalErrors += batch.length;
      }
    }

    // Clean up JSON file
    fs.unlinkSync(tempJsonFile);

    console.log('\n\n========================================');
    console.log('📊 POI Import Summary');
    console.log('========================================');
    console.log(`   Total processed: ${totalProcessed}`);
    console.log(`   Total imported:  ${totalImported}`);
    console.log(`   Total skipped:   ${totalSkipped}`);
    console.log(`   Total errors:    ${totalErrors}`);
    console.log('========================================\n');

    const sampleCount = await HotelPOI.countDocuments();
    console.log(`📦 Total POI records in database: ${sampleCount}`);

    console.log('\n✅ POI import completed successfully!');

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup temp files
    try {
      if (fs.existsSync(tempZstFile)) fs.unlinkSync(tempZstFile);
      if (fs.existsSync(tempJsonFile)) fs.unlinkSync(tempJsonFile);
    } catch (e) {}

    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let language = 'en';
let limit = null;

for (const arg of args) {
  if (arg.startsWith('--language=')) {
    language = arg.split('=')[1];
  }
  if (arg.startsWith('--limit=')) {
    limit = parseInt(arg.split('=')[1]);
  }
}

importPoiDump(language, limit);
