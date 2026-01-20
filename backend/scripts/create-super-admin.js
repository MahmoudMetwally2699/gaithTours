/**
 * Script: Create Super Admin User
 *
 * Creates a super admin user with full permissions
 *
 * Run with: node scripts/create-super-admin.js
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

const SUPER_ADMIN_DATA = {
  name: 'Mohamed Abdalla',
  email: 'm.abdalla@gaithtours.com',
  password: 'Gaith@2035',
  phone: '+201025900963',
  nationality: 'Egypt',
  role: 'super_admin',
  adminPermissions: ALL_PERMISSIONS,
  isEmailVerified: true
};

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gaithtours');
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: SUPER_ADMIN_DATA.email });

    if (existingUser) {
      console.log('⚠️  User already exists with this email');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Permissions: ${existingUser.adminPermissions.join(', ')}`);

      // Ask if we should update the existing user
      console.log('\n🔄 Updating existing user to super admin with full permissions...');

      existingUser.role = 'super_admin';
      existingUser.adminPermissions = ALL_PERMISSIONS;
      existingUser.isEmailVerified = true;
      existingUser.password = SUPER_ADMIN_DATA.password; // This will be hashed by the pre-save hook
      existingUser.phone = SUPER_ADMIN_DATA.phone;
      existingUser.nationality = SUPER_ADMIN_DATA.nationality;

      await existingUser.save();
      console.log('✅ User updated successfully!');
    } else {
      // Create new super admin user
      console.log('📝 Creating new super admin user...');

      const newUser = new User(SUPER_ADMIN_DATA);
      await newUser.save();

      console.log('✅ Super admin user created successfully!');
    }

    // Display user details
    const user = await User.findOne({ email: SUPER_ADMIN_DATA.email });
    console.log('\n👤 User Details:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Permissions: ${user.adminPermissions.join(', ')}`);
    console.log(`   Email Verified: ${user.isEmailVerified}`);
    console.log(`   Created: ${user.createdAt.toLocaleString()}`);

    // Display summary
    console.log('\n📊 Admin Summary:');
    const superAdmins = await User.find({ role: 'super_admin' });
    const subAdmins = await User.find({ role: 'sub_admin' });
    const regularAdmins = await User.find({ role: 'admin' });
    console.log(`   Super Admins: ${superAdmins.length}`);
    console.log(`   Regular Admins: ${regularAdmins.length}`);
    console.log(`   Sub Admins: ${subAdmins.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`   ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
createSuperAdmin();
