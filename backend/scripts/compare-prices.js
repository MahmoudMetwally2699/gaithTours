/**
 * Simple Price Comparison Script
 * Outputs comparison to a JSON file
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const hotelName = process.argv[2] || 'Rosh Rayhaan by Rotana';
const API_URL = 'http://localhost:5001/api';

async function comparePrices() {
  const results = {
    hotelName: hotelName,
    timestamp: new Date().toISOString(),
    serpData: null,
    hpData: null,
    comparison: null
  };

  try {
    // Calculate dates (tomorrow, 1 night)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const checkin = tomorrow.toISOString().split('T')[0];
    const checkout = dayAfter.toISOString().split('T')[0];

    results.dates = { checkin, checkout, nights: 1 };

    // Step 1: Search to get SERP price
    const searchUrl = `${API_URL}/hotels/search?destination=${encodeURIComponent(hotelName)}&checkin=${checkin}&checkout=${checkout}&adults=2`;
    const searchResponse = await axios.get(searchUrl);
    const searchData = searchResponse.data;

    if (searchData.success && searchData.data.hotels.length > 0) {
      const serpHotel = searchData.data.hotels.find(h => h.isSearchedHotel) || searchData.data.hotels[0];

      results.serpData = {
        name: serpHotel.name,
        hid: serpHotel.hid,
        price: serpHotel.price,
        pricePerNight: serpHotel.pricePerNight,
        currency: serpHotel.currency
      };

      // Step 2: Get HP price
      const detailsUrl = `${API_URL}/hotels/details/${serpHotel.hid}?checkin=${checkin}&checkout=${checkout}&adults=2`;
      const detailsResponse = await axios.get(detailsUrl);
      const hotelDetails = detailsResponse.data.data.hotel;

      if (hotelDetails.rates && hotelDetails.rates.length > 0) {
        const cheapestRate = hotelDetails.rates.reduce((min, r) => (r.price < min.price) ? r : min);

        results.hpData = {
          name: hotelDetails.name,
          address: hotelDetails.address,
          starRating: hotelDetails.star_rating,
          totalRates: hotelDetails.rates.length,
          cheapestRate: {
            roomName: cheapestRate.room_name,
            price: cheapestRate.price,
            currency: cheapestRate.currency,
            meal: cheapestRate.meal,
            freeCancellation: cheapestRate.is_free_cancellation
          },
          topRates: hotelDetails.rates.slice(0, 5).map(r => ({
            roomName: r.room_name,
            price: r.price,
            currency: r.currency,
            meal: r.meal
          }))
        };

        // Comparison
        const serpPrice = results.serpData.price;
        const hpPrice = cheapestRate.price;
        const diff = hpPrice - serpPrice;
        const diffPercent = ((diff / serpPrice) * 100).toFixed(1);

        results.comparison = {
          serpPrice: serpPrice,
          hpPrice: hpPrice,
          difference: diff,
          differencePercent: parseFloat(diffPercent),
          result: Math.abs(diff) < 1 ? 'MATCH' : (diff > 0 ? 'HP_HIGHER' : 'HP_LOWER')
        };
      }
    }
  } catch (error) {
    results.error = error.message;
  }

  // Write to file
  fs.writeFileSync('price-comparison-result.json', JSON.stringify(results, null, 2));

  // Also print formatted output
  console.log('\n========== PRICE COMPARISON RESULTS ==========\n');
  console.log('Hotel: ' + results.hotelName);
  console.log('Dates: ' + results.dates?.checkin + ' to ' + results.dates?.checkout);
  console.log('');

  if (results.serpData) {
    console.log('--- SERP (Homepage) ---');
    console.log('Price: ' + results.serpData.currency + ' ' + results.serpData.price);
    console.log('Per Night: ' + results.serpData.currency + ' ' + results.serpData.pricePerNight);
  }

  if (results.hpData) {
    console.log('');
    console.log('--- HP (Hotel Details) ---');
    console.log('Cheapest Rate: ' + results.hpData.cheapestRate.currency + ' ' + results.hpData.cheapestRate.price);
    console.log('Room: ' + results.hpData.cheapestRate.roomName);
  }

  if (results.comparison) {
    console.log('');
    console.log('--- COMPARISON ---');
    console.log('SERP: ' + results.serpData.currency + ' ' + results.comparison.serpPrice);
    console.log('HP:   ' + results.serpData.currency + ' ' + results.comparison.hpPrice);
    console.log('Diff: ' + results.comparison.difference.toFixed(2) + ' (' + results.comparison.differencePercent + '%)');
    console.log('Result: ' + results.comparison.result);
  }

  console.log('\nFull results saved to: price-comparison-result.json');
}

comparePrices();
