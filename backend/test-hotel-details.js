// Quick test to see what the hotel details API returns
const axios = require('axios');

async function testHotelDetails() {
    const hotelId = 'pyramids_land_hotel'; // Example hotel ID

    try {
        const response = await axios.get(
            `http://localhost:5001/api/hotels/details/${hotelId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.TEST_TOKEN || 'your-token-here'}`
                }
            }
        );

        console.log('✅ Hotel Details API Response:\n');
        console.log(JSON.stringify(response.data, null, 2));

        const hotel = response.data.data?.hotel;
        if (hotel) {
            console.log('\n📋 Key Fields:');
            console.log(`   Name: ${hotel.name}`);
            console.log(`   Address: ${hotel.address || 'MISSING'}`);
            console.log(`   City: ${hotel.city || 'MISSING'}`);
            console.log(`   Country: ${hotel.country || 'MISSING'}`);
            console.log(`   Description: ${hotel.description ? 'YES' : 'NO'}`);
            console.log(`   Amenities: ${hotel.amenities?.length || 0}`);
            console.log(`   Images: ${hotel.images?.length || 0}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testHotelDetails();
