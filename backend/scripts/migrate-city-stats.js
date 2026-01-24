/**
 * Migration Script: Populate CityStats from HotelContent
 *
 * This script aggregates hotel data by city and populates the CityStats collection
 * for instant O(1) lookups during search.
 *
 * Also updates cityNormalized field on HotelContent documents.
 *
 * Run: node backend/scripts/migrate-city-stats.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function migrate() {
  console.log('🚀 Starting CityStats migration...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Import models after connection
    const HotelContent = require('../models/HotelContent');
    const CityStats = require('../models/CityStats');

    // Step 1: Aggregate hotels by city
    console.log('📊 Aggregating hotel counts by city...');
    console.log('   (This may take a few minutes for large datasets)\n');

    const startTime = Date.now();

    const cityAggregation = await HotelContent.aggregate([
      {
        $group: {
          _id: { $toLower: { $trim: { input: '$city' } } },
          cityDisplay: { $first: '$city' },
          country: { $first: '$country' },
          countryCode: { $first: '$countryCode' },
          totalHotels: { $sum: 1 },
          ratedHotels: {
            $sum: {
              $cond: [{ $gt: ['$starRating', 0] }, 1, 0]
            }
          },
          star1: {
            $sum: { $cond: [{ $eq: ['$starRating', 1] }, 1, 0] }
          },
          star2: {
            $sum: { $cond: [{ $eq: ['$starRating', 2] }, 1, 0] }
          },
          star3: {
            $sum: { $cond: [{ $eq: ['$starRating', 3] }, 1, 0] }
          },
          star4: {
            $sum: { $cond: [{ $eq: ['$starRating', 4] }, 1, 0] }
          },
          star5: {
            $sum: { $cond: [{ $eq: ['$starRating', 5] }, 1, 0] }
          }
        }
      },
      {
        $match: {
          _id: { $ne: null, $ne: '' }
        }
      },
      {
        $sort: { totalHotels: -1 }
      }
    ]).allowDiskUse(true);

    const aggregationTime = Date.now() - startTime;
    console.log(`✅ Aggregation complete in ${(aggregationTime / 1000).toFixed(1)}s`);
    console.log(`   Found ${cityAggregation.length} unique cities\n`);

    // Step 2: Upsert into CityStats
    console.log('📥 Upserting CityStats records...');

    const batchSize = 100;
    let processed = 0;
    let errors = 0;

    for (let i = 0; i < cityAggregation.length; i += batchSize) {
      const batch = cityAggregation.slice(i, i + batchSize);

      const bulkOps = batch.map(city => ({
        updateOne: {
          filter: { cityNormalized: city._id },
          update: {
            $set: {
              cityNormalized: city._id,
              cityDisplay: city.cityDisplay || city._id,
              country: city.country || '',
              countryCode: city.countryCode || '',
              totalHotels: city.totalHotels,
              ratedHotels: city.ratedHotels,
              starCounts: {
                1: city.star1,
                2: city.star2,
                3: city.star3,
                4: city.star4,
                5: city.star5
              },
              lastUpdated: new Date()
            }
          },
          upsert: true
        }
      }));

      try {
        await CityStats.bulkWrite(bulkOps, { ordered: false });
        processed += batch.length;

        // Progress update every 1000 cities
        if (processed % 1000 === 0 || processed === cityAggregation.length) {
          const percent = ((processed / cityAggregation.length) * 100).toFixed(1);
          console.log(`   Progress: ${processed}/${cityAggregation.length} cities (${percent}%)`);
        }
      } catch (err) {
        errors += batch.length;
        console.error(`   ❌ Batch error: ${err.message}`);
      }
    }

    console.log(`\n✅ CityStats migration complete!`);
    console.log(`   Processed: ${processed} cities`);
    console.log(`   Errors: ${errors}`);

    // Step 3: Update HotelContent with cityNormalized field
    console.log('\n📝 Updating HotelContent with cityNormalized field...');

    const updateStart = Date.now();

    // Use aggregation pipeline update for bulk operation
    const updateResult = await HotelContent.updateMany(
      { city: { $exists: true, $ne: null, $ne: '' } },
      [
        {
          $set: {
            cityNormalized: { $toLower: { $trim: { input: '$city' } } }
          }
        }
      ]
    );

    const updateTime = Date.now() - updateStart;
    console.log(`✅ Updated ${updateResult.modifiedCount} HotelContent documents in ${(updateTime / 1000).toFixed(1)}s`);

    // Step 4: Show top cities
    console.log('\n📊 Top 10 cities by hotel count:');
    const topCities = cityAggregation.slice(0, 10);
    topCities.forEach((city, i) => {
      console.log(`   ${i + 1}. ${city.cityDisplay}: ${city.totalHotels} hotels (${city.ratedHotels} rated)`);
    });

    // Summary
    const totalTime = Date.now() - startTime;
    console.log(`\n🎉 Migration completed in ${(totalTime / 1000).toFixed(1)}s`);
    console.log('\n💡 Next steps:');
    console.log('   1. Restart backend server to pick up changes');
    console.log('   2. Test search performance with: GET /api/hotels/search?destination=Dubai');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

migrate();
