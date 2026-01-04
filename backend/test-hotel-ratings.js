/**
 * Test script to check hotel ratings from the API
 * Run with: node test-hotel-ratings.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

async function testHotelRatings() {
  console.log('🔍 Testing hotel ratings from API...\n');

  const cities = ['Riyadh', 'Jeddah', 'Makkah'];

  for (const city of cities) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 Testing: ${city}`);
    console.log('='.repeat(60));

    try {
      const response = await axios.get(`${API_URL}/hotels/suggested?location=${city}`);
      const hotels = response.data.data.hotels;

      console.log(`\n✅ Received ${hotels.length} hotels from ${city}\n`);

      // Group hotels by rating
      const ratingGroups = {};
      hotels.forEach(hotel => {
        const rating = hotel.rating || 0;
        if (!ratingGroups[rating]) {
          ratingGroups[rating] = [];
        }
        ratingGroups[rating].push(hotel);
      });

      // Display hotels grouped by rating
      const sortedRatings = Object.keys(ratingGroups).sort((a, b) => b - a);

      sortedRatings.forEach(rating => {
        const count = ratingGroups[rating].length;
        const stars = '⭐'.repeat(Math.round(rating));
        console.log(`\n${stars} Rating: ${rating} (${count} hotels)`);
        console.log('-'.repeat(60));

        ratingGroups[rating].forEach((hotel, index) => {
          console.log(`${index + 1}. ${hotel.name}`);
          console.log(`   Price: ${hotel.currency} ${hotel.price}`);
          console.log(`   Rating: ${hotel.rating}`);
          console.log(`   City: ${hotel.city || 'N/A'}`);
        });
      });

      // Summary
      console.log(`\n📊 Summary for ${city}:`);
      console.log(`   Total hotels: ${hotels.length}`);
      console.log(`   5-star (rating >= 4.5): ${hotels.filter(h => h.rating >= 4.5).length}`);
      console.log(`   4-star (rating >= 4.0): ${hotels.filter(h => h.rating >= 4.0 && h.rating < 4.5).length}`);
      console.log(`   3-star (rating >= 3.0): ${hotels.filter(h => h.rating >= 3.0 && h.rating < 4.0).length}`);
      console.log(`   Below 3-star: ${hotels.filter(h => h.rating < 3.0).length}`);

    } catch (error) {
      console.error(`❌ Error fetching hotels from ${city}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Test complete!');
  console.log('='.repeat(60));
}

// Run the test
testHotelRatings().catch(console.error);
