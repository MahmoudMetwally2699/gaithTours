/**
 * Drop Hotel Content Collection
 *
 * This script removes all documents from the HotelContent collection.
 * Useful before re-importing fresh data from dumps.
 *
 * Usage:
 *   node scripts/drop-hotel-content.js
 *
 * WARNING: This will delete ALL hotel content data!
 */

require('dotenv').config();
const mongoose = require('mongoose');
const HotelContent = require('../models/HotelContent');
const readline = require('readline');

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function dropHotelContent() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get current count
    const count = await HotelContent.countDocuments();
    console.log(`📊 Current hotel content records: ${count.toLocaleString()}\n`);

    if (count === 0) {
      console.log('✅ Collection is already empty. Nothing to drop.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Ask for confirmation
    console.log('⚠️  WARNING: This will delete ALL hotel content data!');
    rl.question('Are you sure you want to proceed? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        console.log('\n🗑️  Dropping hotel content collection...');

        const result = await HotelContent.deleteMany({});

        console.log(`✅ Deleted ${result.deletedCount.toLocaleString()} records`);
        console.log('✅ Hotel content collection cleared successfully!\n');
      } else {
        console.log('\n❌ Operation cancelled.');
      }

      // Cleanup
      rl.close();
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
dropHotelContent();
