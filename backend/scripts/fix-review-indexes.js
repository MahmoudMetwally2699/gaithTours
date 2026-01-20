/**
 * Fix Hotel Review Indexes
 *
 * Drops the old unique index on 'hid' and recreates proper compound index
 *
 * Usage:
 *   node scripts/fix-review-indexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const collection = mongoose.connection.collection('hotel_reviews');

    // Get existing indexes
    console.log('📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Drop the problematic unique index on hid
    try {
      console.log('\n🗑️  Dropping old hid_1 unique index...');
      await collection.dropIndex('hid_1');
      console.log('✅ Dropped hid_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('⚠️  Index hid_1 does not exist (already dropped or never created)');
      } else {
        throw err;
      }
    }

    // Drop the existing compound index (without unique constraint)
    try {
      console.log('\n🗑️  Dropping existing hid_1_language_1 index...');
      await collection.dropIndex('hid_1_language_1');
      console.log('✅ Dropped hid_1_language_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('⚠️  Index hid_1_language_1 does not exist');
      } else {
        throw err;
      }
    }

    // Ensure compound unique index exists
    console.log('\n📌 Creating compound unique index on hid + language...');
    await collection.createIndex(
      { hid: 1, language: 1 },
      { unique: true, name: 'hid_1_language_1' }
    );
    console.log('✅ Created compound unique index');

    // Show final indexes
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✅ Index fix complete!');
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixIndexes();
