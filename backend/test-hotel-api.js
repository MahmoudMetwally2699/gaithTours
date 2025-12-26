// Test what the hotel details API actually returns
const axios = require('axios');

async function testHotelDetailsAPI() {
    const hotelId = '11028521';

    try {
        const response = await axios.get(
            `http://localhost:5001/api/hotels/details/${hotelId}`
        );

        const hotel = response.data.data?.hotel;

        console.log('\n📋 Hotel Details API Response:\n');
        console.log(`Name: ${hotel.name}`);
        console.log(`Address: ${hotel.address}`);
        console.log(`City: ${hotel.city}`);
        console.log(`Description: ${hotel.description ? 'YES' : 'NO'}`);
        console.log(`\n🎯 AMENITIES:`);
        console.log(`   Field exists: ${hotel.amenities !== undefined}`);
        console.log(`   Is array: ${Array.isArray(hotel.amenities)}`);
        console.log(`   Count: ${hotel.amenities?.length || 0}`);

        if (hotel.amenities && hotel.amenities.length > 0) {
            console.log(`\n   First 10 amenities:`);
            hotel.amenities.slice(0, 10).forEach((a, i) => {
                console.log(`   ${i + 1}. ${a}`);
            });
        } else {
            console.log(`   ❌ NO AMENITIES IN RESPONSE!`);
        }

        console.log(`\n📦 Full hotel object keys:`);
        console.log(Object.keys(hotel).join(', '));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testHotelDetailsAPI();
