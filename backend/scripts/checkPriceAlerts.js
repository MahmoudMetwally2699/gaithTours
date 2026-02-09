#!/usr/bin/env node

/**
 * Check Price Alerts Script
 *
 * This script checks all active price alerts and sends notifications for price drops.
 * It can be run manually or scheduled via cron job.
 *
 * Usage:
 *   node scripts/checkPriceAlerts.js
 *
 * Recommended cron schedule (every 6 hours):
 *   0 */6 * * * cd /path/to/backend && node scripts/checkPriceAlerts.js >> logs/price-alerts.log 2>&1
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { checkAllPriceAlerts } = require('../utils/priceAlertService');

async function main() {
  console.log('='.repeat(60));
  console.log(`Price Alert Check - ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gaithtours', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected');

    // Run price alert check
    const results = await checkAllPriceAlerts();

    console.log('\n📊 Summary:');
    console.log(JSON.stringify(results, null, 2));

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');

    process.exit(0);
  } catch (error) {
    console.error('❌ Script failed:', error);

    // Try to disconnect
    try {
      await mongoose.disconnect();
    } catch (e) {
      // Ignore disconnect error
    }

    process.exit(1);
  }
}

main();
