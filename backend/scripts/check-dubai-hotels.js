/**
 * Script to check the actual number of Dubai hotels in MongoDB
 * Run: node scripts/check-dubai-hotels.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import HotelContent model
const HotelContent = require('../models/HotelContent');

async function checkDubaiHotels() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Count Dubai hotels (case-insensitive)
    console.log('🔍 Counting Dubai hotels...');
    const dubaiCount = await HotelContent.countDocuments({
      city: { $regex: new RegExp('^Dubai$', 'i') }
    });
    console.log(`📊 Total Dubai hotels in DB: ${dubaiCount.toLocaleString()}\n`);

    // Get some sample records
    console.log('📋 Sample Dubai hotel records:');
    const samples = await HotelContent.find({
      city: { $regex: new RegExp('^Dubai$', 'i') }
    })
    .limit(5)
    .select('name city hid hotelId starRating address')
    .lean();

    samples.forEach((hotel, index) => {
      console.log(`${index + 1}. ${hotel.name}`);
      console.log(`   City: ${hotel.city}`);
      console.log(`   HID: ${hotel.hid}`);
      console.log(`   Hotel ID: ${hotel.hotelId}`);
      console.log(`   Star Rating: ${hotel.starRating || 'N/A'}`);
      console.log(`   Address: ${hotel.address || 'N/A'}`);
      console.log('');
    });

    // Check city name variations
    console.log('🔍 Checking for city name variations:');
    const variations = ['dubai', 'Dubai', 'DUBAI', 'دبي'];

    for (const variation of variations) {
      const count = await HotelContent.countDocuments({
        city: variation
      });
      if (count > 0) {
        console.log(`   "${variation}": ${count.toLocaleString()} hotels`);
      }
    }

    // Get total hotels in entire DB
    console.log('\n📊 Database Statistics:');
    const totalHotels = await HotelContent.countDocuments({});
    console.log(`   Total hotels in DB: ${totalHotels.toLocaleString()}`);
    console.log(`   Dubai hotels: ${dubaiCount.toLocaleString()} (${((dubaiCount / totalHotels) * 100).toFixed(2)}%)`);

    // Get distinct cities count
    const distinctCities = await HotelContent.distinct('city');
    console.log(`   Total cities: ${distinctCities.length.toLocaleString()}`);

    // Get star rating distribution for Dubai
    console.log('\n⭐ Dubai Hotels by Star Rating:');
    const starDistribution = await HotelContent.aggregate([
      {
        $match: {
          city: { $regex: new RegExp('^Dubai$', 'i') }
        }
      },
      {
        $group: {
          _id: '$starRating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    starDistribution.forEach(item => {
      const stars = item._id || 'Unrated';
      console.log(`   ${stars} stars: ${item.count.toLocaleString()} hotels`);
    });

    // Check if hotels have images
    console.log('\n🖼️  Dubai Hotels with Images:');
    const withImages = await HotelContent.countDocuments({
      city: { $regex: new RegExp('^Dubai$', 'i') },
      $or: [
        { images: { $exists: true, $ne: [] } },
        { mainImage: { $exists: true, $ne: null } }
      ]
    });
    console.log(`   Hotels with images: ${withImages.toLocaleString()} (${((withImages / dubaiCount) * 100).toFixed(2)}%)`);

    // Check if hotels have coordinates
    console.log('\n📍 Dubai Hotels with Location Data:');
    const withCoordinates = await HotelContent.countDocuments({
      city: { $regex: new RegExp('^Dubai$', 'i') },
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    });
    console.log(`   Hotels with coordinates: ${withCoordinates.toLocaleString()} (${((withCoordinates / dubaiCount) * 100).toFixed(2)}%)`);

    console.log('\n✅ Script completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the script
checkDubaiHotels();
