/**
 * Process Hotel Reviews Dump
 *
 * This script downloads and processes the hotel reviews dump from RateHawk API
 * and stores it in MongoDB for fast access.
 *
 * The dump should be updated weekly as per RateHawk recommendations.
 *
 * Usage:
 *   node process-reviews-dump.js [language] [incremental]
 *
 * Examples:
 *   node process-reviews-dump.js en          # Full dump in English
 *   node process-reviews-dump.js ar          # Full dump in Arabic
 *   node process-reviews-dump.js en true     # Incremental dump in English
 *
 * Environment Variables Required:
 *   - RATEHAWK_KEY_ID
 *   - RATEHAWK_API_KEY
 *   - MONGODB_URI
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');
const mongoose = require('mongoose');
const HotelReview = require('../models/HotelReview');
const rateHawkService = require('../utils/RateHawkService');

// Try to load ZSTD decompression library
let ZstdCodec;
try {
  ZstdCodec = require('zstd-codec');
} catch (e) {
  console.warn('⚠️  zstd-codec not installed. Will try alternative methods.');
}

// Configuration
const LANGUAGE = process.argv[2] || 'en';
const IS_INCREMENTAL = process.argv[3] === 'true';
const DUMP_DIR = path.join(__dirname, '..', 'data', 'reviews-dumps');
const BATCH_SIZE = 1000; // Process in batches to avoid memory issues

/**
 * Ensure dump directory exists
 */
function ensureDumpDir() {
  if (!fs.existsSync(DUMP_DIR)) {
    fs.mkdirSync(DUMP_DIR, { recursive: true });
    console.log(`📁 Created directory: ${DUMP_DIR}`);
  }
}

/**
 * Download the dump file
 */
async function downloadDump(url, outputPath) {
  console.log(`⬇️  Downloading dump from: ${url}`);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      let downloaded = 0;
      const total = parseInt(response.headers['content-length'], 10);

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        file.write(chunk);

        if (total) {
          const percent = ((downloaded / total) * 100).toFixed(1);
          process.stdout.write(`\r⬇️  Downloading: ${percent}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`);
        }
      });

      response.on('end', () => {
        file.end();
        console.log('\n✅ Download complete');
        resolve(outputPath);
      });

      response.on('error', (err) => {
        file.end();
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * Detect file format and decompress if needed
 */
async function decompressIfNeeded(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  // If it's already .json or .jsonl, no decompression needed
  if (ext === '.json' || ext === '.jsonl') {
    console.log('✅ File is already decompressed');
    return filePath;
  }

  // Check if it's gzip or zstd
  if (ext === '.gz') {
    console.log('📦 Decompressing gzip file...');
    const zlib = require('zlib');
    const { promisify } = require('util');
    const { pipeline } = require('stream');
    const pipelineAsync = promisify(pipeline);

    const outputPath = filePath.replace('.gz', '');
    const gunzip = zlib.createGunzip();
    const source = fs.createReadStream(filePath);
    const destination = fs.createWriteStream(outputPath);

    await pipelineAsync(source, gunzip, destination);
    console.log('✅ Decompression complete');
    return outputPath;
  }

  if (ext === '.zst') {
    console.log('📦 Decompressing ZSTD file...');

    if (!ZstdCodec) {
      throw new Error('zstd-codec is required for .zst files. Install with: npm install zstd-codec');
    }

    // ZSTD decompression (streaming)
    const outputPath = filePath.replace('.zst', '');
    const ZstdDecompressStream = require('../utils/ZstdDecompressStream');
    const source = fs.createReadStream(filePath);
    const decompressor = new ZstdDecompressStream();
    const destination = fs.createWriteStream(outputPath);

    await new Promise((resolve, reject) => {
      source.pipe(decompressor).pipe(destination);
      destination.on('finish', resolve);
      destination.on('error', reject);
    });

    console.log('✅ Decompression complete');
    return outputPath;
  }

  // Unknown format, try to use as-is
  console.log('⚠️  Unknown compression format, using file as-is');
  return filePath;
}

/**
 * Process dump file - handles both JSONL and single JSON array formats
 */
async function processDumpFile(filePath, language, isIncremental) {
  console.log(`📖 Processing dump file: ${filePath}`);

  // First, try to detect the format by reading first few lines
  const firstLines = [];
  const testStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const testRl = readline.createInterface({
    input: testStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of testRl) {
    firstLines.push(line.trim());
    lineCount++;
    if (lineCount >= 3) break;
  }
  testRl.close();
  testStream.destroy();

  // Check if first line is valid standalone JSON (JSONL format)
  let isJSONL = false;
  if (firstLines[0] && firstLines[0].startsWith('{')) {
    try {
      const testObj = JSON.parse(firstLines[0]);
      if (testObj.hid || testObj.id) {
        isJSONL = true;
        console.log('✅ Detected format: JSONL (one JSON per line)');
      }
    } catch (e) {
      // Not JSONL
    }
  }

  // If first line starts with '[', it's a JSON array
  if (firstLines[0] && firstLines[0].startsWith('[')) {
    console.log('✅ Detected format: JSON Array');
    return await processSingleJSON(filePath, language, isIncremental);
  }

  // If JSONL format detected, process line by line
  if (isJSONL) {
    return await processDumpLineByLine(filePath, language, isIncremental);
  }

  // Otherwise, try to read as single JSON
  console.log('⚠️  Format unclear, trying as single JSON...');
  return await processSingleJSON(filePath, language, isIncremental);
}

/**
 * Process dump as a single JSON file (array or object with data property)
 */
async function processSingleJSON(filePath, language, isIncremental) {
  console.log(`📖 Reading entire file as JSON...`);

  const content = fs.readFileSync(filePath, 'utf8');
  let hotels = [];

  try {
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed)) {
      hotels = parsed;
      console.log('✅ Parsed as JSON Array');
    } else if (parsed.data && Array.isArray(parsed.data)) {
      hotels = parsed.data;
      console.log('✅ Parsed as JSON Object with data array');
    } else if (typeof parsed === 'object' && parsed.hid) {
      hotels = [parsed];
      console.log('✅ Parsed as single hotel object');
    } else if (typeof parsed === 'object') {
      // Object with hotel IDs as keys (e.g., {"hotel_id_1": {...}, "hotel_id_2": {...}})
      hotels = Object.keys(parsed).map(key => {
        const hotel = parsed[key];
        if (!hotel.hotel_id && !hotel.id) {
          hotel.hotel_id = key; // Use the key as hotel_id if not present
        }
        return hotel;
      });
      console.log('✅ Parsed as JSON Object with hotel IDs as keys');
    } else {
      throw new Error('Unrecognized JSON structure');
    }
  } catch (error) {
    console.error('❌ Failed to parse JSON:', error.message);
    console.error('First 500 chars:', content.substring(0, 500));
    throw error;
  }

  console.log(`📊 Total hotels in dump: ${hotels.length}`);

  let processedCount = 0;
  let errorCount = 0;
  let batch = [];

  for (let i = 0; i < hotels.length; i++) {
    try {
      const hotelData = hotels[i];

      if (!hotelData || !hotelData.hid) {
        errorCount++;
        continue;
      }

      // Transform data to match our schema
      const reviews = hotelData.reviews || [];

      // Calculate average rating and review count
      let averageRating = null;
      let reviewCount = reviews.length;

      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => {
          return sum + (review.rating || 0);
        }, 0);
        averageRating = totalRating / reviews.length;
      }

      const reviewDoc = {
        hotel_id: hotelData.id || hotelData.hotel_id || `hotel_${hotelData.hid}`,
        hid: hotelData.hid,
        language: language,
        reviews: reviews,
        average_rating: averageRating,
        review_count: reviewCount,
        source: isIncremental ? 'incremental' : 'dump',
        dump_date: new Date(),
        last_updated: new Date()
      };

      batch.push(reviewDoc);

      // Process batch when it reaches BATCH_SIZE
      if (batch.length >= BATCH_SIZE) {
        await processBatch(batch, isIncremental);
        processedCount += batch.length;
        const percent = ((i / hotels.length) * 100).toFixed(1);
        console.log(`✅ Processed ${processedCount}/${hotels.length} (${percent}%)...`);
        batch = [];
      }
    } catch (error) {
      errorCount++;
      if (errorCount <= 10) {
        console.error(`❌ Error processing entry ${i + 1}:`, error.message);
      }
    }
  }

  // Process remaining items in batch
  if (batch.length > 0) {
    await processBatch(batch, isIncremental);
    processedCount += batch.length;
  }

  console.log(`\n✅ Processing complete!`);
  console.log(`   Total: ${hotels.length}`);
  console.log(`   Processed: ${processedCount}`);
  console.log(`   Errors: ${errorCount}`);

  if (processedCount > 0) {
    console.log(`   Success rate: ${((processedCount/(processedCount+errorCount))*100).toFixed(1)}%`);
  }

  return { processedCount, errorCount };
}

/**
 * Process dump file line by line (for JSONL format)
 */
async function processDumpLineByLine(filePath, language, isIncremental) {
  console.log(`📖 Processing line by line...`);

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let processedCount = 0;
    let errorCount = 0;
    let batch = [];
    let lineNumber = 0;

    rl.on('line', async (line) => {
      lineNumber++;

      try {
        line = line.trim();
        if (!line || line.length === 0) return;

        // Remove trailing carriage return if present
        if (line[line.length - 1] === '\r') {
          line = line.substring(0, line.length - 1);
        }

        if (!line.startsWith('{')) {
          return; // Skip non-JSON lines
        }

        const hotelData = JSON.parse(line);

        if (!hotelData || !hotelData.hid) {
          errorCount++;
          return;
        }

        // Transform data to match our schema
        const reviews = hotelData.reviews || [];

        // Calculate average rating and review count
        let averageRating = null;
        let reviewCount = reviews.length;

        if (reviews.length > 0) {
          const totalRating = reviews.reduce((sum, review) => {
            return sum + (review.rating || 0);
          }, 0);
          averageRating = totalRating / reviews.length;
        }

        const reviewDoc = {
          hotel_id: hotelData.id || hotelData.hotel_id || `hotel_${hotelData.hid}`,
          hid: hotelData.hid,
          language: language,
          reviews: reviews,
          average_rating: averageRating,
          review_count: reviewCount,
          source: isIncremental ? 'incremental' : 'dump',
          dump_date: new Date(),
          last_updated: new Date()
        };

        batch.push(reviewDoc);

        // Process batch when it reaches BATCH_SIZE
        if (batch.length >= BATCH_SIZE) {
          rl.pause(); // Pause reading while processing
          await processBatch([...batch], isIncremental);
          processedCount += batch.length;
          console.log(`✅ Processed ${processedCount} entries (${((processedCount/lineNumber)*100).toFixed(1)}%)...`);
          batch = [];
          rl.resume(); // Resume reading
        }
      } catch (error) {
        errorCount++;
        if (errorCount <= 10) {
          console.error(`❌ Error processing line ${lineNumber}:`, error.message.substring(0, 100));
        }
      }
    });

    rl.on('close', async () => {
      // Process remaining items in batch
      if (batch.length > 0) {
        await processBatch(batch, isIncremental);
        processedCount += batch.length;
      }

      console.log(`\n✅ Processing complete!`);
      console.log(`   Total lines: ${lineNumber}`);
      console.log(`   Processed: ${processedCount}`);
      console.log(`   Errors: ${errorCount}`);

      if (processedCount > 0) {
        console.log(`   Success rate: ${((processedCount/(processedCount+errorCount))*100).toFixed(1)}%`);
      }

      resolve({ processedCount, errorCount });
    });

    rl.on('error', reject);
  });
}

/**
 * Process a batch of reviews
 */
async function processBatch(batch, isIncremental) {
  try {
    const operations = batch.map(reviewDoc => {
      const filter = { hid: reviewDoc.hid, language: reviewDoc.language };

      if (isIncremental) {
        // For incremental updates, append new reviews to existing ones
        return {
          updateOne: {
            filter,
            update: {
              $set: {
                hotel_id: reviewDoc.hotel_id,
                hid: reviewDoc.hid,
                language: reviewDoc.language,
                source: reviewDoc.source,
                dump_date: reviewDoc.dump_date,
                last_updated: reviewDoc.last_updated
              },
              $addToSet: {
                reviews: { $each: reviewDoc.reviews }
              }
            },
            upsert: true
          }
        };
      } else {
        // For full dumps, replace existing data
        return {
          updateOne: {
            filter,
            update: {
              $set: reviewDoc
            },
            upsert: true
          }
        };
      }
    });

    const result = await HotelReview.bulkWrite(operations, { ordered: false });
    return result;
  } catch (error) {
    console.error('❌ Batch processing error:', error.message);
    // Continue processing even if batch fails
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🏨 Hotel Reviews Dump Processor');
  console.log('='.repeat(60));
  console.log(`Language: ${LANGUAGE}`);
  console.log(`Mode: ${IS_INCREMENTAL ? 'Incremental' : 'Full'}`);
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Ensure dump directory exists
    ensureDumpDir();

    // 2. Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 3. Get dump URL from API
    console.log('📡 Fetching dump information from RateHawk API...');
    let dumpInfo;

    if (IS_INCREMENTAL) {
      dumpInfo = await rateHawkService.getIncrementalReviewsDump(LANGUAGE);
    } else {
      dumpInfo = await rateHawkService.getReviewsDump(LANGUAGE);
    }

    if (!dumpInfo.success) {
      console.error('❌ Failed to get dump information:', dumpInfo.message);
      process.exit(1);
    }

    console.log(`✅ Dump URL: ${dumpInfo.url}`);
    console.log(`📅 Last updated: ${dumpInfo.last_update}\n`);

    // 4. Download dump
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const urlParts = dumpInfo.url.split('/');
    const originalFilename = urlParts[urlParts.length - 1];
    const dumpPath = path.join(DUMP_DIR, `reviews_${LANGUAGE}_${timestamp}_${originalFilename}`);

    await downloadDump(dumpInfo.url, dumpPath);

    // 5. Decompress if needed
    const decompressedPath = await decompressIfNeeded(dumpPath);

    // 6. Process dump and update MongoDB
    const stats = await processDumpFile(decompressedPath, LANGUAGE, IS_INCREMENTAL);

    // 7. Get database statistics
    console.log('\n📊 Database Statistics:');
    const dbStats = await HotelReview.aggregate([
      { $match: { language: LANGUAGE } },
      {
        $group: {
          _id: null,
          total_hotels: { $sum: 1 },
          total_reviews: { $sum: '$review_count' },
          avg_rating: { $avg: '$average_rating' }
        }
      }
    ]);

    if (dbStats.length > 0) {
      console.log(`   Total hotels with reviews: ${dbStats[0].total_hotels}`);
      console.log(`   Total reviews: ${dbStats[0].total_reviews}`);
      console.log(`   Average rating: ${dbStats[0].avg_rating?.toFixed(2) || 'N/A'}`);
    }

    // 8. Cleanup: delete downloaded files
    console.log('\n🗑️  Cleaning up...');
    try {
      if (fs.existsSync(dumpPath)) {
        fs.unlinkSync(dumpPath);
        console.log('✅ Compressed file deleted');
      }
      if (decompressedPath !== dumpPath && fs.existsSync(decompressedPath)) {
        fs.unlinkSync(decompressedPath);
        console.log('✅ Decompressed file deleted');
      }
    } catch (cleanupError) {
      console.warn('⚠️  Error during cleanup:', cleanupError.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Dump processing completed successfully!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Always disconnect from MongoDB
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the script
main();
