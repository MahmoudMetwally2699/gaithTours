/**
 * Script to fetch all room rates and their taxes for a hotel
 *
 * Usage:
 *   node scripts/get-room-rates-taxes.js <hotelId> [options]
 *
 * Options:
 *   --checkin=YYYY-MM-DD   Check-in date (default: tomorrow)
 *   --checkout=YYYY-MM-DD  Check-out date (default: day after tomorrow)
 *   --adults=N             Number of adults (default: 2)
 *   --currency=XXX         Currency code (default: USD)
 *   --output=json|table    Output format (default: table)
 *
 * Example:
 *   node scripts/get-room-rates-taxes.js 7857523 --checkin=2026-01-25 --checkout=2026-01-27 --adults=2
 */

require('dotenv').config();
const rateHawkService = require('../utils/RateHawkService');
const mongoose = require('mongoose');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    hotelId: null,
    checkin: null,
    checkout: null,
    adults: 2,
    currency: 'USD',
    output: 'table'
  };

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (key && value) {
        options[key] = value;
      }
    } else if (!options.hotelId) {
      options.hotelId = parseInt(arg);
    }
  }

  // Default dates: tomorrow and day after
  if (!options.checkin || !options.checkout) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    options.checkin = options.checkin || tomorrow.toISOString().split('T')[0];
    options.checkout = options.checkout || dayAfter.toISOString().split('T')[0];
  }

  return options;
}

// Format currency amount
function formatCurrency(amount, currency) {
  return `${currency} ${Number(amount).toFixed(2)}`;
}

// Extract and display room rates with taxes
async function getRoomRatesAndTaxes(options) {
  console.log('\n🏨 Room Rates & Taxes Extractor');
  console.log('================================\n');

  if (!options.hotelId) {
    console.error('❌ Error: Hotel ID is required');
    console.log('\nUsage: node scripts/get-room-rates-taxes.js <hotelId> [options]');
    console.log('\nOptions:');
    console.log('  --checkin=YYYY-MM-DD   Check-in date');
    console.log('  --checkout=YYYY-MM-DD  Check-out date');
    console.log('  --adults=N             Number of adults (default: 2)');
    console.log('  --currency=XXX         Currency code (default: USD)');
    console.log('  --output=json|table    Output format (default: table)');
    process.exit(1);
  }

  console.log(`📋 Parameters:`);
  console.log(`   Hotel ID: ${options.hotelId}`);
  console.log(`   Check-in: ${options.checkin}`);
  console.log(`   Check-out: ${options.checkout}`);
  console.log(`   Adults: ${options.adults}`);
  console.log(`   Currency: ${options.currency}`);
  console.log('');

  try {
    // Connect to MongoDB (required for margin service)
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Use RateHawk service singleton

    console.log('🔍 Fetching hotel details from RateHawk API...\n');

    // Get hotel details with rates
    const hotelDetails = await rateHawkService.getHotelDetails(options.hotelId, {
      checkin: options.checkin,
      checkout: options.checkout,
      adults: parseInt(options.adults),
      children: [],
      currency: options.currency
    });

    if (!hotelDetails) {
      console.error('❌ Hotel not found');
      process.exit(1);
    }

    console.log(`✅ Hotel: ${hotelDetails.name}`);
    console.log(`   Address: ${hotelDetails.address || 'N/A'}`);
    console.log(`   Star Rating: ${'⭐'.repeat(hotelDetails.star_rating || 0)}`);
    console.log('');

    const rates = hotelDetails.rates || [];

    if (rates.length === 0) {
      console.log('⚠️  No rates available for the selected dates');
      process.exit(0);
    }

    console.log(`📊 Found ${rates.length} room rates:\n`);

    // Prepare data for output
    const rateData = rates.map((rate, index) => {
      const taxes = rate.tax_data?.taxes || [];
      const includedTaxes = taxes.filter(t => t.included_by_supplier);
      const excludedTaxes = taxes.filter(t => !t.included_by_supplier);

      return {
        index: index + 1,
        roomName: rate.room_name || 'Unknown Room',
        meal: rate.meal || 'No meal',
        basePrice: rate.price,
        originalPrice: rate.original_price,
        pricePerNight: rate.price_per_night,
        currency: rate.currency,
        totalTaxes: rate.total_taxes || 0,
        taxesCurrency: rate.taxes_currency,
        includesTaxes: includedTaxes,
        payAtHotelTaxes: excludedTaxes,
        allTaxes: taxes,
        isFreeCancellation: rate.is_free_cancellation,
        freeCancellationBefore: rate.free_cancellation_before,
        marginApplied: rate.margin_applied,
        bookHash: rate.book_hash,
        matchHash: rate.match_hash
      };
    });

    if (options.output === 'json') {
      // JSON output
      console.log(JSON.stringify({
        hotel: {
          id: hotelDetails.hid,
          name: hotelDetails.name,
          address: hotelDetails.address,
          starRating: hotelDetails.star_rating
        },
        searchParams: {
          checkin: options.checkin,
          checkout: options.checkout,
          adults: options.adults,
          currency: options.currency
        },
        rates: rateData
      }, null, 2));
    } else {
      // Table output
      console.log('=' .repeat(100));

      rateData.forEach((rate, idx) => {
        console.log(`\n📌 RATE #${rate.index}: ${rate.roomName}`);
        console.log('-'.repeat(80));

        console.log(`   Meal Type: ${rate.meal}`);
        console.log(`   Base Price (with margin): ${formatCurrency(rate.basePrice, rate.currency)}`);
        console.log(`   Original Price (before margin): ${formatCurrency(rate.originalPrice, rate.currency)}`);
        console.log(`   Price Per Night: ${formatCurrency(rate.pricePerNight, rate.currency)}`);

        if (rate.marginApplied) {
          console.log(`   Margin Applied: ${rate.marginApplied.marginPercentage?.toFixed(1) || rate.marginApplied.marginValue}% (${rate.marginApplied.ruleName})`);
        }

        console.log('');
        console.log('   💰 TAXES:');

        if (rate.allTaxes.length === 0) {
          console.log('      No tax data available');
        } else {
          console.log(`      Total Taxes: ${formatCurrency(rate.totalTaxes, rate.taxesCurrency)}`);
          console.log('');

          if (rate.includesTaxes.length > 0) {
            console.log('      ✅ INCLUDED IN PRICE (paid at booking):');
            rate.includesTaxes.forEach(tax => {
              console.log(`         • ${tax.name}: ${formatCurrency(tax.amount, tax.currency || rate.taxesCurrency)}`);
            });
          }

          if (rate.payAtHotelTaxes.length > 0) {
            console.log('');
            console.log('      🏨 PAY AT HOTEL:');
            rate.payAtHotelTaxes.forEach(tax => {
              console.log(`         • ${tax.name}: ${formatCurrency(tax.amount, tax.currency || rate.taxesCurrency)}`);
            });
          }
        }

        console.log('');
        console.log('   📋 POLICIES:');
        console.log(`      Free Cancellation: ${rate.isFreeCancellation ? '✅ Yes' : '❌ No'}`);
        if (rate.freeCancellationBefore) {
          console.log(`      Free Until: ${new Date(rate.freeCancellationBefore).toLocaleString()}`);
        }

        console.log('');
        console.log(`   🔑 Booking Hash: ${rate.bookHash?.substring(0, 40)}...`);

        console.log('-'.repeat(80));
      });

      // Summary
      console.log('\n' + '='.repeat(100));
      console.log('\n📊 SUMMARY:');
      console.log(`   Total Rates: ${rateData.length}`);

      const priceRange = {
        min: Math.min(...rateData.map(r => r.basePrice)),
        max: Math.max(...rateData.map(r => r.basePrice))
      };
      console.log(`   Price Range: ${formatCurrency(priceRange.min, options.currency)} - ${formatCurrency(priceRange.max, options.currency)}`);

      const freeCancellationCount = rateData.filter(r => r.isFreeCancellation).length;
      console.log(`   Free Cancellation Rates: ${freeCancellationCount} of ${rateData.length}`);

      // Unique tax types found
      const uniqueTaxTypes = new Set();
      rateData.forEach(rate => {
        rate.allTaxes.forEach(tax => uniqueTaxTypes.add(tax.name));
      });

      if (uniqueTaxTypes.size > 0) {
        console.log(`   Tax Types Found: ${[...uniqueTaxTypes].join(', ')}`);
      }
    }

    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   API Response:', error.response.data);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
const options = parseArgs();
getRoomRatesAndTaxes(options);
