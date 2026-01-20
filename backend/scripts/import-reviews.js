
require('dotenv').config({ path: '../.env' });
const path = require('path');
// If running from root:
require('dotenv').config();

const mongoose = require('mongoose');
const axios = require('axios');
const zlib = require('zlib');
const fs = require('fs');
const RateHawkService = require('../utils/RateHawkService');
const HotelReview = require('../models/HotelReview');

// Configuration
const BATCH_SIZE = 1000;
const DOWNLOAD_PATH = path.join(__dirname, '../temp/reviews_dump.json.gz');
const EXTRACT_PATH = path.join(__dirname, '../temp/reviews_dump.json');

// Ensure temp directory exists
if (!fs.existsSync(path.join(__dirname, '../temp'))) {
  fs.mkdirSync(path.join(__dirname, '../temp'));
}

async function runImport() {
  console.log('🚀 Starting Incremental Reviews Import...');

  try {
    // 1. Connect to Database
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gaithTours';
    console.log(`📦 Connecting to MongoDB at: ${uri}`);
    await mongoose.connect(uri);
    console.log('📦 Connected to MongoDB');

    // 2. Get Dump URL
    const service = RateHawkService;
    console.log('🔗 Fetching Dump URL...');
    const urlResult = await service.getIncrementalReviewsDump('en');

    if (!urlResult.success || !urlResult.url) {
      throw new Error('Failed to get dump URL');
    }

    const dumpUrl = urlResult.url;
    console.log(`⬇️  Downloading dump from: ${dumpUrl}`);

    // 3. Download File
    const writer = fs.createWriteStream(DOWNLOAD_PATH);
    const response = await axios({
      url: dumpUrl,
      method: 'GET',
      responseType: 'stream'
    });
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    console.log('✅ Download complete.');

    // 4. Unzip File
    console.log('📦 Unzipping file...');
    const fileContents = fs.createReadStream(DOWNLOAD_PATH);
    const writeStream = fs.createWriteStream(EXTRACT_PATH);
    const unzip = zlib.createGunzip();

    fileContents.pipe(unzip).pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    console.log('✅ Unzip complete.');

    // 5. Parse JSON
    console.log('📖 Parsing JSON...');
    const rawData = fs.readFileSync(EXTRACT_PATH, 'utf8');
    const data = JSON.parse(rawData);

    let hotelsData = [];

    // Dump Structure Logic: Map of HotelID -> { hid, rating, detailed_ratings, reviews: [] }
    if (typeof data === 'object' && !Array.isArray(data)) {
        console.log('📋 Processing hotels...');

        for (const hotelIdStr of Object.keys(data)) {
           const hotelObj = data[hotelIdStr];

           // Each hotel has: hid, rating, detailed_ratings, reviews
           if (hotelObj && typeof hotelObj === 'object' && Array.isArray(hotelObj.reviews)) {
               hotelsData.push({
                   hotel_id: hotelIdStr,
                   hid: hotelObj.hid,
                   overall_rating: hotelObj.rating || null,
                   detailed_ratings: hotelObj.detailed_ratings || {},
                   reviews: hotelObj.reviews,
                   review_count: hotelObj.reviews.length,
                   // Calculate average rating from individual reviews if available
                   average_rating: hotelObj.reviews.length > 0
                       ? hotelObj.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / hotelObj.reviews.length
                       : (hotelObj.rating || null)
               });

               process.stdout.write(`\r✅ Processed hotel ${hotelIdStr}: ${hotelObj.reviews.length} reviews`);
           }
        }
        console.log('\n');
    }

    console.log(`📊 Found ${hotelsData.length} hotels with reviews to process.`);

    // 6. Bulk Upsert - one document per hotel
    console.log('💾 Importing to Database...');
    let ops = [];
    let hotelCount = 0;

    for (const hotel of hotelsData) {
        ops.push({
            updateOne: {
                filter: {
                    hotel_id: hotel.hotel_id,
                    language: 'en' // Using language from the dump
                },
                update: {
                    $set: {
                        ...hotel,
                        language: 'en',
                        imported_at: new Date(),
                        dump_date: new Date()
                    }
                },
                upsert: true
            }
        });

        if (ops.length >= BATCH_SIZE) {
            await HotelReview.bulkWrite(ops);
            hotelCount += ops.length;
            process.stdout.write(`\r✅ Processed ${hotelCount} hotels...`);
            ops = [];
        }
    }

    if (ops.length > 0) {
        await HotelReview.bulkWrite(ops);
        hotelCount += ops.length;
    }

    const totalReviews = hotelsData.reduce((sum, h) => sum + h.review_count, 0);
    console.log(`\n🎉 Import Complete! Processed ${hotelCount} hotels with ${totalReviews} reviews.`);

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    // Cleanup
    try {
        if (fs.existsSync(DOWNLOAD_PATH)) fs.unlinkSync(DOWNLOAD_PATH);
        if (fs.existsSync(EXTRACT_PATH)) fs.unlinkSync(EXTRACT_PATH);
    } catch (e) {}

    mongoose.disconnect();
  }
}

runImport();
