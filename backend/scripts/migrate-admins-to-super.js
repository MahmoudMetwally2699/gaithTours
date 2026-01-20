/**
 * Migration Script: Migrate existing admin users to super_admin
 *
 * This script updates all users with role 'admin' to 'super_admin'
 * and grants them all permissions.
 *
 * Run with: node scripts/migrate-admins-to-super.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const ALL_PERMISSIONS = [
  'dashboard',
  'clients',
  'bookings',
  'payments',
  'margins',
  'whatsapp',
  'admin_management'
];

async function migrateAdmins() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gaithtours', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`📋 Found ${adminUsers.length} admin user(s) to migrate`);

    if (adminUsers.length === 0) {
      console.log('ℹ️  No admin users found. Nothing to migrate.');
      return;
    }

    // Update each admin user
    for (const user of adminUsers) {
      console.log(`\n🔄 Migrating user: ${user.email}`);

      user.role = 'super_admin';
      user.adminPermissions = ALL_PERMISSIONS;
      await user.save();

      console.log(`   ✅ Updated to super_admin with all permissions`);
    }

    console.log(`\n✅ Migration complete! ${adminUsers.length} user(s) updated.`);

    // Display summary
    console.log('\n📊 Summary:');
    const superAdmins = await User.find({ role: 'super_admin' });
    const subAdmins = await User.find({ role: 'sub_admin' });
    console.log(`   Super Admins: ${superAdmins.length}`);
    console.log(`   Sub Admins: ${subAdmins.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateAdmins();
