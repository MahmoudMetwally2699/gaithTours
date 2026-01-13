/**
 * Test Booking Flow - RateHawk Test Hotel
 *
 * This script demonstrates the complete booking flow using the RateHawk test hotel:
 * - HID: 8473727
 * - ID: test_hotel_do_not_book
 *
 * Usage: node test-booking-flow.js
 *
 * The script will:
 * 1. Search the test hotel for available rates (HP API)
 * 2. Select a rate and prebook to get book_hash
 * 3. Create booking form
 * 4. Start booking with test guest data
 * 5. Check booking status
 *
 * NOTE: All test bookings should be canceled afterward per ETG requirements.
 */

require('dotenv').config();
const axios = require('axios');

// RateHawk Test Hotel
const TEST_HOTEL_HID = 8473727;
const TEST_HOTEL_ID = 'test_hotel_do_not_book';

// API Configuration
const KEY_ID = process.env.RATEHAWK_KEY_ID;
const API_KEY = process.env.RATEHAWK_API_KEY;
const BASE_URL = 'https://api.worldota.net/api/b2b/v3';

// Test dates (30 days from now, 2 nights)
const getTestDates = () => {
  const checkin = new Date();
  checkin.setDate(checkin.getDate() + 30);
  const checkout = new Date(checkin);
  checkout.setDate(checkout.getDate() + 2);

  const formatDate = (d) => d.toISOString().split('T')[0];
  return {
    checkin: formatDate(checkin),
    checkout: formatDate(checkout)
  };
};

// Helper to make authenticated requests
async function makeRequest(endpoint, data) {
  try {
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}${endpoint}`,
      auth: {
        username: KEY_ID,
        password: API_KEY
      },
      headers: {
        'Content-Type': 'application/json'
      },
      data
    });
    return response.data;
  } catch (error) {
    console.error(`❌ API Error for ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

// Step 1: Search for test hotel rates
async function searchTestHotel() {
  console.log('\n' + '='.repeat(60));
  console.log('📍 STEP 1: Searching for test hotel rates');
  console.log('='.repeat(60));

  const dates = getTestDates();
  console.log(`   Hotel HID: ${TEST_HOTEL_HID}`);
  console.log(`   Check-in: ${dates.checkin}`);
  console.log(`   Check-out: ${dates.checkout}`);

  const payload = {
    hid: TEST_HOTEL_HID,
    checkin: dates.checkin,
    checkout: dates.checkout,
    residency: 'gb',
    language: 'en',
    guests: [{ adults: 2, children: [] }],
    currency: 'USD'
  };

  console.log('\n📤 Request payload:', JSON.stringify(payload, null, 2));

  const response = await makeRequest('/search/hp/', payload);

  console.log('\n📥 Response status:', response.status);

  const hotel = response.data?.hotels?.[0];
  if (!hotel) {
    console.log('❌ No hotel found in response');
    return null;
  }

  console.log(`\n✅ Found hotel: ${hotel.id}`);
  console.log(`   Rates available: ${hotel.rates?.length || 0}`);

  if (hotel.rates && hotel.rates.length > 0) {
    // IMPORTANT: Per ETG docs, we MUST book a REFUNDABLE rate to avoid "insufficient_b2b_balance" error
    // Look for a rate with free_cancellation_before in the future
    const now = new Date();

    // Find refundable rates (with free_cancellation_before in the future)
    const refundableRates = hotel.rates.filter(rate => {
      const cancellationPenalties = rate.payment_options?.payment_types?.[0]?.cancellation_penalties;
      if (cancellationPenalties?.free_cancellation_before) {
        const freeCancelDate = new Date(cancellationPenalties.free_cancellation_before);
        return freeCancelDate > now;
      }
      return false;
    });

    console.log(`\n   📋 Refundable rates found: ${refundableRates.length}`);

    // Use the first refundable rate, or fall back to first rate if none found
    const selectedRate = refundableRates.length > 0 ? refundableRates[0] : hotel.rates[0];
    const isRefundable = refundableRates.length > 0;

    console.log(`\n   Selected rate details (${isRefundable ? 'REFUNDABLE ✓' : 'NON-REFUNDABLE ⚠️'}):`);
    console.log(`   - Room: ${selectedRate.room_name}`);
    console.log(`   - Meal: ${selectedRate.meal}`);

    const cancellationInfo = selectedRate.payment_options?.payment_types?.[0]?.cancellation_penalties;
    if (cancellationInfo?.free_cancellation_before) {
      console.log(`   - Free cancellation before: ${cancellationInfo.free_cancellation_before}`);
    }

    console.log(`   - Match Hash (first 50 chars): ${selectedRate.match_hash?.substring(0, 50)}...`);
    console.log(`   - Match Hash (full length): ${selectedRate.match_hash?.length} chars`);
    console.log(`   - Has book_hash directly?: ${!!selectedRate.book_hash}`);
    if (selectedRate.book_hash) {
      console.log(`   - Book Hash (first 50 chars): ${selectedRate.book_hash?.substring(0, 50)}...`);
    }

    const paymentType = selectedRate.payment_options?.payment_types?.[0];
    console.log(`   - Price: ${paymentType?.show_amount} ${paymentType?.show_currency_code}`);

    if (!isRefundable) {
      console.log('\n   ⚠️  WARNING: No refundable rates found. Booking may fail with insufficient_b2b_balance.');
      console.log('   Per ETG docs: "Please book refundable rates... otherwise, you will experience the insufficient_b2b_balance error."');
    }

    // Return the full rate object to preserve all hashes
    return selectedRate;
  }

  return null;
}

// Step 2: Prebook rate to get book_hash
async function prebookRate(matchHash) {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 STEP 2: Prebooking rate to get book_hash');
  console.log('='.repeat(60));

  const payload = {
    hash: matchHash,
    language: 'en'
  };

  console.log('\n📤 Prebook request...');

  const response = await makeRequest('/hotel/prebook', payload);

  console.log('\n📥 Prebook response status:', response.status);

  const rateData = response.data?.hotels?.[0]?.rates?.[0];
  if (!rateData?.book_hash) {
    console.log('❌ No book_hash in prebook response');
    console.log('   Full response:', JSON.stringify(response, null, 2));
    return null;
  }

  console.log(`\n✅ Got book_hash: ${rateData.book_hash.substring(0, 50)}...`);
  return rateData.book_hash;
}

// Step 3: Create booking form
async function createBookingForm(bookHash, partnerOrderId) {
  console.log('\n' + '='.repeat(60));
  console.log('📝 STEP 3: Creating booking form');
  console.log('='.repeat(60));

  const payload = {
    partner_order_id: partnerOrderId,
    book_hash: bookHash,
    language: 'en',
    user_ip: '127.0.0.1'
  };

  console.log(`   Partner Order ID: ${partnerOrderId}`);
  console.log('\n📤 Creating booking form...');

  try {
    const response = await makeRequest('/hotel/order/booking/form/', payload);

    console.log('\n📥 Response status:', response.status);

    // Check for sandbox restriction
    if (response.error === 'sandbox_restriction') {
      console.log('\n⚠️  SANDBOX RESTRICTION DETECTED');
      console.log('   This is expected when using sandbox credentials with a real hotel.');
      console.log('   Your sandbox credentials can ONLY book the test hotel (hid=8473727).');
      return { sandbox_restriction: true };
    }

    if (response.status === 'ok') {
      console.log(`\n✅ Booking form created!`);
      console.log(`   Order ID: ${response.data?.order_id}`);
      console.log(`   Item ID: ${response.data?.item_id}`);
      return response.data;
    }

    console.log('❌ Unexpected response:', JSON.stringify(response, null, 2));
    return null;
  } catch (error) {
    // Handle sandbox restriction in error response
    if (error.response?.data?.error === 'sandbox_restriction') {
      console.log('\n⚠️  SANDBOX RESTRICTION ERROR');
      console.log('   Your sandbox credentials can ONLY book the test hotel (hid=8473727).');
      console.log('   Full error:', JSON.stringify(error.response.data, null, 2));
      return { sandbox_restriction: true };
    }
    throw error;
  }
}

// Step 4: Start booking with guest details
async function startBooking(partnerOrderId, paymentInfo) {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 STEP 4: Starting booking with guest details');
  console.log('='.repeat(60));

  const payload = {
    partner: {
      partner_order_id: partnerOrderId,
      comment: 'Test booking - please cancel after verification',
      amount_sell_b2b2c: '0'
    },
    user: {
      email: 'test@example.com',
      phone: '+1234567890',
      comment: 'Test booking for certification'
    },
    supplier_data: {
      first_name_original: 'Test',
      last_name_original: 'User',
      phone: '+1234567890',
      email: 'test@example.com'
    },
    language: 'en',
    rooms: [
      {
        guests: [
          {
            first_name: 'Test',
            last_name: 'User'
          }
        ]
      }
    ],
    payment_type: paymentInfo || {
      type: 'deposit',
      amount: '0.00',
      currency_code: 'USD'
    }
  };

  console.log('\n📤 Starting booking...');

  const response = await makeRequest('/hotel/order/booking/finish/', payload);

  console.log('\n📥 Response status:', response.status);
  console.log('   Full response:', JSON.stringify(response, null, 2));

  return response;
}

// Step 5: Check booking status
async function checkBookingStatus(partnerOrderId) {
  console.log('\n' + '='.repeat(60));
  console.log('⏳ STEP 5: Checking booking status');
  console.log('='.repeat(60));

  const payload = {
    partner_order_id: partnerOrderId
  };

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    console.log(`\n   Attempt ${attempts + 1}/${maxAttempts}...`);

    const response = await makeRequest('/hotel/order/booking/finish/status/', payload);

    console.log(`   Status: ${response.status}`);
    console.log(`   Percent: ${response.data?.percent || 'N/A'}`);

    if (response.status === 'ok') {
      console.log('\n✅ BOOKING CONFIRMED!');
      console.log('   Order ID:', response.data?.order_id);
      return { success: true, data: response.data };
    }

    if (response.status === 'error') {
      console.log('\n❌ BOOKING FAILED!');
      console.log('   Error:', response.error);
      return { success: false, error: response.error };
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n⚠️  Max attempts reached, booking still processing');
  return { success: false, error: 'timeout' };
}

// Main execution
async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     RateHawk Test Hotel Booking Flow                       ║');
  console.log('║     Test Hotel HID: 8473727                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Check credentials
  if (!KEY_ID || !API_KEY) {
    console.error('\n❌ Missing credentials!');
    console.error('   Set RATEHAWK_KEY_ID and RATEHAWK_API_KEY in .env file');
    process.exit(1);
  }

  console.log(`\n🔑 Using credentials: Key ID = ${KEY_ID}`);

  try {
    // Step 1: Search test hotel
    const rate = await searchTestHotel();
    if (!rate) {
      console.log('\n❌ Could not find rates for test hotel');
      process.exit(1);
    }

    // Step 2: Get book_hash
    // HP API may return book_hash directly, otherwise we need to prebook
    let bookHash;
    if (rate.book_hash) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ STEP 2: Using book_hash directly from HP response (no prebook needed)');
      console.log('='.repeat(60));
      console.log(`   Book Hash: ${rate.book_hash.substring(0, 50)}...`);
      bookHash = rate.book_hash;
    } else {
      bookHash = await prebookRate(rate.match_hash);
      if (!bookHash) {
        console.log('\n❌ Could not get book_hash');
        process.exit(1);
      }
    }

    // Generate unique order ID
    const partnerOrderId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Step 3: Create booking form
    const bookingForm = await createBookingForm(bookHash, partnerOrderId);

    if (bookingForm?.sandbox_restriction) {
      console.log('\n' + '='.repeat(60));
      console.log('📋 SUMMARY: Sandbox Restriction Encountered');
      console.log('='.repeat(60));
      console.log('\nThe booking form creation returned sandbox_restriction.');
      console.log('This means your credentials are in SANDBOX mode.');
      console.log('\nTo complete a test booking in sandbox mode, ensure you are');
      console.log('using the test hotel (hid=8473727) which we are already doing.');
      console.log('\nIf you still get this error, contact your RateHawk account');
      console.log('manager to verify your sandbox credentials are properly configured.');
      process.exit(0);
    }

    if (!bookingForm) {
      console.log('\n❌ Could not create booking form');
      process.exit(1);
    }

    // Get payment info from booking form response
    // NOTE: API requires exact amount from booking form - cannot set to 0
    const paymentInfo = bookingForm.payment_types?.[0];

    // Step 4: Start booking
    await startBooking(partnerOrderId, paymentInfo);

    // Step 5: Check status
    const result = await checkBookingStatus(partnerOrderId);

    console.log('\n' + '='.repeat(60));
    console.log('📋 FINAL RESULT');
    console.log('='.repeat(60));

    if (result.success) {
      console.log('\n✅ TEST BOOKING COMPLETED SUCCESSFULLY!');
      console.log(`   Order ID: ${result.data?.order_id}`);
      console.log(`   Partner Order ID: ${partnerOrderId}`);
      console.log('\n⚠️  IMPORTANT: Remember to cancel this test booking!');
      console.log('   Use the cancel endpoint or contact RateHawk support.');
    } else {
      console.log('\n❌ Test booking failed');
      console.log(`   Error: ${result.error}`);
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

main();
