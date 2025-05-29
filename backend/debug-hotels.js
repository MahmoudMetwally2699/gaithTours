const axios = require('axios');
require('dotenv').config();

async function testHotelAPI() {
  console.log('Testing Hotel API...');
  console.log('API Host:', process.env.RAPIDAPI_HOST);
  console.log('API Key exists:', !!process.env.RAPIDAPI_KEY);

  try {
    // First test destination search
    console.log('\n=== Testing Destination Search ===');
    const destOptions = {
      method: 'GET',
      url: `https://${process.env.RAPIDAPI_HOST}/api/v1/hotels/searchDestination`,
      params: {
        query: 'Tokyo'
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
      }
    };

    const destResponse = await axios.request(destOptions);
    console.log('Destination Status:', destResponse.data.status);
    console.log('Destination Count:', destResponse.data.data?.length || 0);

    if (destResponse.data.data?.length > 0) {
      const dest = destResponse.data.data[0];
      console.log('First destination:', {
        dest_id: dest.dest_id,
        name: dest.name,
        dest_type: dest.dest_type,
        hotels: dest.hotels || dest.nr_hotels
      });

      // Now test hotel search with this destination
      console.log('\n=== Testing Hotel Search ===');
      const hotelOptions = {
        method: 'GET',
        url: `https://${process.env.RAPIDAPI_HOST}/api/v1/hotels/searchHotels`,
        params: {
          dest_id: dest.dest_id,
          search_type: dest.dest_type === 'city' ? 'city' : 'district',
          arrival_date: '2025-05-29',
          departure_date: '2025-05-30',
          adults: 1,
          children: 0,
          room_qty: 1,
          page_number: 0,
          languagecode: 'en-us',
          currency_code: 'USD'
        },
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
        }
      };

      console.log('Hotel search params:', hotelOptions.params);

      const hotelResponse = await axios.request(hotelOptions);
      console.log('Hotel Status:', hotelResponse.data.status);
      console.log('Hotel Message:', hotelResponse.data.message);
      console.log('Full response:', JSON.stringify(hotelResponse.data, null, 2));

      if (hotelResponse.data.data?.hotels?.length > 0) {
        console.log('Hotels found:', hotelResponse.data.data.hotels.length);
        console.log('First hotel keys:', Object.keys(hotelResponse.data.data.hotels[0]));
        console.log('First hotel sample:', JSON.stringify(hotelResponse.data.data.hotels[0], null, 2));
      } else {
        console.log('No hotels found in response');
        console.log('Response data structure:', hotelResponse.data.data ? Object.keys(hotelResponse.data.data) : 'No data');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testHotelAPI();
